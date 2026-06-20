import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { requireLibraryAccess, requireRole } from '../middleware/permission';

const router = Router();

const ROLE_HIERARCHY: Record<string, number> = { admin: 4, manager: 3, editor: 2, viewer: 1 };

// 工具：处理 JSON 字段序列化
function serializeCard(card: any, role?: string) {
  const userLevel = ROLE_HIERARCHY[role || ''] || 0;

  // 解析 JSON 字段
  const result = { ...card };
  for (const field of ['educationBackground', 'workExperience', 'socialPositions', 'skills']) {
    if (typeof result[field] === 'string') {
      try { result[field] = JSON.parse(result[field]); } catch { result[field] = null; }
    }
  }

  return result;
}

// GET /api/cards
router.get('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.user.id;
    const { libraryId, search, groupId, page = '1', pageSize = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    const where: any = {};
    let userRole = 'viewer';

    if (libraryId) {
      where.libraryId = parseInt(libraryId as string, 10);

      // 获取用户对库的权限
      if (req.user.role === 'super_admin') {
        userRole = 'admin';
      } else {
        const lib = await prisma.cardLibrary.findUnique({ where: { id: where.libraryId }, select: { ownerId: true } });
        if (lib && lib.ownerId === userId) {
          userRole = 'admin';
        } else {
          const member = await prisma.libraryMember.findUnique({
            where: { libraryId_userId: { libraryId: where.libraryId, userId } },
          });
          if (member) userRole = member.role;
        }
      }

      // 非 admin/manager 只能看公开的 + 自己的
      if (!['admin', 'manager'].includes(userRole)) {
        where.OR = [
          { isPublic: true },
          { ownerId: userId },
        ];
      }
    } else {
      // 没指定 libraryId，看所有自己有权限的库的名片
      if (req.user.role !== 'super_admin') {
        const myLibs = await prisma.libraryMember.findMany({
          where: { userId },
          select: { libraryId: true },
        });
        const myOwnedLibs = await prisma.cardLibrary.findMany({
          where: { ownerId: userId },
          select: { id: true },
        });
        const libIds = [...new Set([...myLibs.map((m: any) => m.libraryId), ...myOwnedLibs.map((l: any) => l.id)])];
        if (libIds.length === 0) return res.json({ data: [], total: 0, page: pageNum, pageSize: pageSizeNum });
        where.libraryId = { in: libIds };
      }
    }

    // 搜索
    if (search) {
      const s = search as string;
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: s } },
            { phone: { contains: s } },
            { company: { contains: s } },
            { position: { contains: s } },
            { email: { contains: s } },
            { wechat: { contains: s } },
            { tags: { contains: s } },
          ],
        },
      ];
    }

    // 分组筛选
    if (groupId) {
      where.groups = { some: { groupId: parseInt(groupId as string, 10) } };
    }

    const [total, data] = await Promise.all([
      prisma.card.count({ where }),
      prisma.card.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: [{ updatedAt: 'desc' }],
      }),
    ]);

    res.json({
      data: data.map((c: any) => serializeCard(c, userRole)),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cards/:id
router.get('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const card = await prisma.card.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { library: { select: { ownerId: true } } },
    });
    if (!card) return res.status(404).json({ error: '名片不存在' });

    // 检查权限
    let userRole = 'viewer';
    if (req.user.role === 'super_admin' || card.library.ownerId === req.user.id || card.ownerId === req.user.id) {
      userRole = 'admin';
    } else {
      const member = await prisma.libraryMember.findUnique({
        where: { libraryId_userId: { libraryId: card.libraryId, userId: req.user.id } },
      });
      if (member) userRole = member.role;
    }

    // 非 admin/manager 且非自己的名片，检查是否公开
    if (!['admin', 'manager'].includes(userRole) && card.ownerId !== req.user.id && !card.isPublic) {
      return res.status(403).json({ error: '无权查看该名片' });
    }

    // 获取字段可见性
    const visibilitySettings = await prisma.cardFieldVisibility.findMany({
      where: { cardId: card.id },
    });
    const visibilityMap: Record<string, string> = {};
    visibilitySettings.forEach((v: any) => { visibilityMap[v.fieldName] = v.visibility; });

    const result: any = serializeCard(card as any, userRole);

    // 非 admin 类的用户，过滤隐藏字段
    if (!['admin', 'manager'].includes(userRole) && card.ownerId !== req.user.id) {
      for (const [field, vis] of Object.entries(visibilityMap)) {
        if (vis === 'hidden' || vis === 'admin_only') {
          delete result[field];
        }
      }
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cards
router.post('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { libraryId, name, phone, ...rest } = req.body;

    if (!libraryId) return res.status(400).json({ error: '缺少名片库 ID' });
    if (!name) return res.status(400).json({ error: '姓名不能为空' });

    // 验证库权限
    if (req.user.role !== 'super_admin') {
      const lib = await prisma.cardLibrary.findUnique({ where: { id: libraryId }, select: { ownerId: true } });
      const ownerMatch = lib && lib.ownerId === req.user.id;
      const member = ownerMatch ? null : await prisma.libraryMember.findUnique({
        where: { libraryId_userId: { libraryId, userId: req.user.id } },
      });
      const role = ownerMatch ? 'admin' : (member?.role || '');
      if (!['admin', 'manager', 'editor'].includes(role)) {
        return res.status(403).json({ error: '没有编辑权限' });
      }
    }

    // 构建数据
    const data: any = { name, phone: phone || '', libraryId, ownerId: req.user.id };

    // 序列化 JSON 字段
    for (const field of ['educationBackground', 'workExperience', 'socialPositions']) {
      const val = rest[field];
      if (val !== undefined) data[field] = typeof val === 'string' ? val : JSON.stringify(val);
    }
    if (rest.skills !== undefined) {
      data.skills = typeof rest.skills === 'string' ? rest.skills : JSON.stringify(rest.skills);
    }

    // 简单字段
    const simpleFields = [
      'email', 'company', 'position', 'jobLevel', 'industry', 'field',
      'gender', 'residentialAddress', 'hometownAddress', 'birthplace',
      'wechat', 'qq', 'website', 'linkedin', 'fax', 'tags', 'remark', 'avatar', 'isPublic',
    ];
    for (const f of simpleFields) {
      if (rest[f] !== undefined) data[f] = rest[f];
    }

    const card = await prisma.card.create({ data });
    res.status(201).json(serializeCard(card));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cards/:id
router.put('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id);
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { id: true, ownerId: true, libraryId: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });

    // 检查权限
    let canEdit = false;
    if (req.user.role === 'super_admin') {
      canEdit = true;
    } else {
      const lib = await prisma.cardLibrary.findUnique({ where: { id: card.libraryId }, select: { ownerId: true } });
      if (lib && lib.ownerId === req.user.id) {
        canEdit = true;
      } else if (card.ownerId === req.user.id) {
        canEdit = true;
      } else {
        const member = await prisma.libraryMember.findUnique({
          where: { libraryId_userId: { libraryId: card.libraryId, userId: req.user.id } },
        });
        if (member && ['admin', 'manager', 'editor'].includes(member.role)) {
          canEdit = true;
        }
      }
    }

    if (!canEdit) return res.status(403).json({ error: '没有编辑权限' });

    const { name, phone, ...rest } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;

    // JSON 字段
    for (const field of ['educationBackground', 'workExperience', 'socialPositions', 'skills']) {
      const val = rest[field];
      if (val !== undefined) {
        data[field] = typeof val === 'string' ? val : JSON.stringify(val);
      }
    }

    const simpleFields = [
      'email', 'company', 'position', 'jobLevel', 'industry', 'field',
      'gender', 'residentialAddress', 'hometownAddress', 'birthplace',
      'wechat', 'qq', 'website', 'linkedin', 'fax', 'tags', 'remark', 'avatar', 'isPublic',
    ];
    for (const f of simpleFields) {
      if (rest[f] !== undefined) data[f] = rest[f];
    }

    const updated = await prisma.card.update({ where: { id: cardId }, data });
    res.json(serializeCard(updated));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cards/:id
router.delete('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id);
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { libraryId: true, ownerId: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });

    // 检查权限：admin/manager 或自己的
    let canDelete = false;
    if (req.user.role === 'super_admin') {
      canDelete = true;
    } else {
      const lib = await prisma.cardLibrary.findUnique({ where: { id: card.libraryId }, select: { ownerId: true } });
      if (lib && lib.ownerId === req.user.id) {
        canDelete = true;
      } else if (card.ownerId === req.user.id) {
        canDelete = true;
      } else {
        const member = await prisma.libraryMember.findUnique({
          where: { libraryId_userId: { libraryId: card.libraryId, userId: req.user.id } },
        });
        if (member && ['admin', 'manager'].includes(member.role)) canDelete = true;
      }
    }

    if (!canDelete) return res.status(403).json({ error: '没有删除权限' });

    await prisma.card.delete({ where: { id: cardId } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cards/:id/visibility
router.get('/:id/visibility', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id);
    const visibilities = await prisma.cardFieldVisibility.findMany({
      where: { cardId },
    });
    res.json(visibilities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cards/:id/visibility
router.put('/:id/visibility', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id);
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { ownerId: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });
    if (card.ownerId !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: '只能设置自己的名片可见性' });
    }

    const { fields } = req.body; // [{ fieldName, visibility }]
    if (!Array.isArray(fields)) return res.status(400).json({ error: 'fields 必须是数组' });

    for (const f of fields) {
      const { fieldName, visibility } = f;
      if (!fieldName || !['public', 'hidden', 'admin_only'].includes(visibility)) continue;
      await prisma.cardFieldVisibility.upsert({
        where: { cardId_fieldName: { cardId, fieldName } },
        update: { visibility },
        create: { cardId, fieldName, visibility },
      });
    }

    const visibilities = await prisma.cardFieldVisibility.findMany({ where: { cardId } });
    res.json(visibilities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
