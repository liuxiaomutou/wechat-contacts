import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const router = Router();

// GET /api/contacts - 联系人列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.app.locals.prisma as PrismaClient;
    const {
      page = '1',
      pageSize = '20',
      search = '',
      groupId,
      favorite
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    // 构建 where 条件
    const where: Prisma.ContactWhereInput = {};

    // 模糊搜索：姓名/手机号/邮箱
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    // 按分组筛选
    if (groupId) {
      where.groups = {
        some: {
          groupId: parseInt(groupId as string, 10)
        }
      };
    }

    // 是否只显示收藏
    if (favorite === 'true' || favorite === true) {
      where.favorite = true;
    }

    // 查询总数和数据
    const [total, data] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          groups: {
            include: {
              group: true
            }
          }
        },
        orderBy: [
          { favorite: 'desc' },
          { updatedAt: 'desc' }
        ]
      })
    ]);

    res.json({
      data,
      total,
      page: pageNum,
      pageSize: pageSizeNum
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/contacts/:id - 联系人详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.app.locals.prisma as PrismaClient;
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/contacts - 新建联系人
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.app.locals.prisma as PrismaClient;
    const {
      name,
      phone,
      email,
      company,
      position,
      remark,
      avatar,
      favorite,
      groupIds
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // 如果提供了 groupIds，先验证分组是否存在
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      const existingGroups = await prisma.group.findMany({
        where: { id: { in: groupIds } },
        select: { id: true }
      });
      
      if (existingGroups.length !== groupIds.length) {
        res.status(400).json({ error: 'Some groups do not exist' });
        return;
      }
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        email,
        company,
        position,
        remark,
        avatar,
        favorite: favorite || false,
        groups: groupIds && Array.isArray(groupIds)
          ? {
              create: groupIds.map((groupId: number) => ({
                group: { connect: { id: groupId } }
              }))
            }
          : undefined
      },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    res.status(201).json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PUT /api/contacts/:id - 更新联系人
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.app.locals.prisma as PrismaClient;
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      company,
      position,
      remark,
      avatar,
      favorite,
      groupIds
    } = req.body;

    // 检查联系人是否存在
    const existingContact = await prisma.contact.findUnique({
      where: { id: parseInt(id, 10) },
      select: { id: true }
    });

    if (!existingContact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    // 如果提供了 groupIds，验证分组是否存在
    if (groupIds !== undefined) {
      if (!Array.isArray(groupIds)) {
        res.status(400).json({ error: 'groupIds must be an array' });
        return;
      }
      
      if (groupIds.length > 0) {
        const existingGroups = await prisma.group.findMany({
          where: { id: { in: groupIds } },
          select: { id: true }
        });
        
        if (existingGroups.length !== groupIds.length) {
          res.status(400).json({ error: 'Some groups do not exist' });
          return;
        }
      }
    }

    // 构建更新数据
    const updateData: Prisma.ContactUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (company !== undefined) updateData.company = company;
    if (position !== undefined) updateData.position = position;
    if (remark !== undefined) updateData.remark = remark;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (favorite !== undefined) updateData.favorite = favorite;

    // 处理分组更新
    if (groupIds !== undefined) {
      // 先删除旧的 ContactGroup 关联
      await prisma.contactGroup.deleteMany({
        where: { contactId: parseInt(id, 10) }
      });

      // 如果有新的分组，创建新的关联
      if (groupIds.length > 0) {
        await prisma.contactGroup.createMany({
          data: groupIds.map((groupId: number) => ({
            contactId: parseInt(id, 10),
            groupId
          }))
        });
      }
    }

    // 更新联系人基本信息
    const contact = await prisma.contact.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    res.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/contacts/:id - 删除联系人
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.app.locals.prisma as PrismaClient;
    const { id } = req.params;

    // 检查联系人是否存在
    const existingContact = await prisma.contact.findUnique({
      where: { id: parseInt(id, 10) },
      select: { id: true }
    });

    if (!existingContact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    // Prisma 的 onDelete: Cascade 会自动删除关联的 ContactGroup
    await prisma.contact.delete({
      where: { id: parseInt(id, 10) }
    });

    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;