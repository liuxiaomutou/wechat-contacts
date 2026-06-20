import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { requireLibraryAccess, requireRole } from '../middleware/permission';

const router = Router();

// GET /api/libraries
router.get('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.user.id;

    // 自己创建的库
    const owned = await prisma.cardLibrary.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { cards: true, members: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    // 作为 member 加入的库
    const memberOf = await prisma.libraryMember.findMany({
      where: { userId },
      include: {
        library: {
          include: { _count: { select: { cards: true, members: true } }, owner: { select: { nickname: true } } },
        },
      },
    });

    const libraries = [
      ...owned.map((l: any) => ({
        ...l,
        role: 'admin',
      })),
      ...memberOf.map((m: any) => ({
        ...m.library,
        role: m.role,
      })),
    ];

    res.json(libraries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/libraries
router.post('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { name, description, avatar } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: '名片库名称不能为空' });
    }

    const library = await prisma.cardLibrary.create({
      data: { name: name.trim(), description, avatar, ownerId: req.user.id },
    });

    res.status(201).json(library);
  } catch (error: any) {
    if (error.message?.includes('Unique constraint')) {
      return res.status(409).json({ error: '已存在同名名片库' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/libraries/:libraryId
router.get('/:libraryId', authMiddleware, requireLibraryAccess, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const library = await prisma.cardLibrary.findUnique({
      where: { id: req.libraryId },
      include: {
        _count: { select: { cards: true, members: true } },
        owner: { select: { nickname: true } },
      },
    });
    if (!library) return res.status(404).json({ error: '名片库不存在' });
    res.json({ ...library, role: req.libraryRole });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/libraries/:libraryId
router.put('/:libraryId', authMiddleware, requireLibraryAccess, requireRole('admin'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { name, description, avatar, fieldSettings } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (avatar !== undefined) data.avatar = avatar;
    if (fieldSettings !== undefined) data.fieldSettings = typeof fieldSettings === 'string' ? fieldSettings : JSON.stringify(fieldSettings);

    const library = await prisma.cardLibrary.update({ where: { id: req.libraryId }, data });
    res.json(library);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/libraries/:libraryId
router.delete('/:libraryId', authMiddleware, requireLibraryAccess, requireRole('admin'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    await prisma.cardLibrary.delete({ where: { id: req.libraryId } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// === 成员管理 ===
// GET /api/libraries/:libraryId/members
router.get('/:libraryId/members', authMiddleware, requireLibraryAccess, requireRole('admin'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const members = await prisma.libraryMember.findMany({
      where: { libraryId: req.libraryId },
      include: { user: { select: { id: true, username: true, nickname: true, avatar: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/libraries/:libraryId/members
router.post('/:libraryId/members', authMiddleware, requireLibraryAccess, requireRole('admin'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { userId, role } = req.body;

    if (!userId) return res.status(400).json({ error: '缺少用户 ID' });
    if (role && !['admin', 'manager', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: '角色无效，可选: admin/manager/editor/viewer' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const member = await prisma.libraryMember.create({
      data: { libraryId: req.libraryId, userId, role: role || 'viewer' },
      include: { user: { select: { id: true, username: true, nickname: true, avatar: true } } },
    });
    res.status(201).json(member);
  } catch (error: any) {
    if (error.message?.includes('Unique constraint')) {
      return res.status(409).json({ error: '该用户已是库成员' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/libraries/:libraryId/members/:memberId
router.put('/:libraryId/members/:memberId', authMiddleware, requireLibraryAccess, requireRole('admin'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { role } = req.body;
    if (!role || !['admin', 'manager', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: '角色无效' });
    }
    const member = await prisma.libraryMember.update({
      where: { id: parseInt(req.params.memberId) },
      data: { role },
      include: { user: { select: { id: true, username: true, nickname: true } } },
    });
    res.json(member);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/libraries/:libraryId/members/:memberId
router.delete('/:libraryId/members/:memberId', authMiddleware, requireLibraryAccess, requireRole('admin'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    await prisma.libraryMember.delete({ where: { id: parseInt(req.params.memberId) } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
