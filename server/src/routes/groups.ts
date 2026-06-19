import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const groupsRouter = Router();

// GET /api/groups - 获取全部分组
groupsRouter.get('/', async (req, res) => {
  try {
    const groups = await req.app.locals.prisma.group.findMany({
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: [
        { sort: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/groups - 创建分组
groupsRouter.post('/', async (req, res) => {
  try {
    const { name, sort } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: '分组名称不能为空' });
    }
    
    const group = await req.app.locals.prisma.group.create({
      data: {
        name: name.trim(),
        sort: sort !== undefined ? sort : 0
      }
    });
    
    res.status(201).json(group);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      res.status(409).json({ error: '分组名称已存在' });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
});

// PUT /api/groups/:id - 更新分组
groupsRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的分组ID' });
    }
    
    const { name, sort } = req.body;
    
    if (name !== undefined && (name === '' || name.trim() === '')) {
      return res.status(400).json({ error: '分组名称不能为空' });
    }
    
    const updatedGroup = await req.app.locals.prisma.group.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        sort: sort !== undefined ? sort : undefined
      }
    });
    
    res.json(updatedGroup);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      res.status(409).json({ error: '分组名称已存在' });
    } else if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({ error: '分组不存在' });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
});

// DELETE /api/groups/:id - 删除分组
groupsRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的分组ID' });
    }
    
    // Prisma 的 onDelete: Cascade 会自动删除关联的 ContactGroup 记录
    await req.app.locals.prisma.group.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      res.status(404).json({ error: '分组不存在' });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
});

// GET /api/groups/:id/contacts - 获取分组下的联系人列表
groupsRouter.get('/:id/contacts', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的分组ID' });
    }
    
    // 获取指定分组下的所有联系人
    const contacts = await req.app.locals.prisma.contact.findMany({
      where: {
        groups: {
          some: {
            groupId: id
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { groupsRouter };