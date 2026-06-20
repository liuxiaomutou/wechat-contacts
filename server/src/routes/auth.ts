import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, generateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { username, password, nickname, phone } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 2) {
      return res.status(400).json({ error: '用户名至少 2 个字符' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 个字符' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, nickname: nickname || username, phone },
    });

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role, avatar: user.avatar },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, nickname: true, avatar: true, phone: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/me
router.put('/me', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { nickname, avatar, phone } = req.body;
    const data: any = {};
    if (nickname !== undefined) data.nickname = nickname;
    if (avatar !== undefined) data.avatar = avatar;
    if (phone !== undefined) data.phone = phone;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, username: true, nickname: true, avatar: true, phone: true, role: true },
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/users - 列出所有用户（仅 admin）
router.get('/users', authMiddleware, async (req: any, res: Response) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: '仅管理员可查看用户列表' });
  }
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const users = await prisma.user.findMany({
      select: { id: true, username: true, nickname: true, role: true, phone: true, avatar: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/users/:id - 更新用户信息
router.put('/users/:id', authMiddleware, async (req: any, res: Response) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: '仅管理员可编辑用户' });
  }
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { nickname, role } = req.body;
    const data: any = {};
    if (nickname !== undefined) data.nickname = nickname;
    if (role !== undefined) data.role = role;

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: { id: true, username: true, nickname: true, role: true },
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
