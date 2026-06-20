import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, generateToken } from '../middleware/auth';

const router = Router();
const USER_SELECT = { id: true, username: true, nickname: true, role: true, phone: true, avatar: true, createdAt: true };
const VALID_USER_ROLES = ['super_admin', 'user'];

function sanitizeUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { username, password, nickname, phone } = req.body;

    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (username.length < 2) return res.status(400).json({ error: '用户名至少 2 个字符' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 个字符' });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(409).json({ error: '用户名已存在' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, nickname: nickname || username, phone, role: 'user' },
    });

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json({ token, user: sanitizeUser(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: USER_SELECT });
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

    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: USER_SELECT });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/password - 当前用户修改密码
router.put('/password', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '旧密码和新密码不能为空' });
    if (newPassword.length < 6) return res.status(400).json({ error: '新密码至少 6 位' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: '旧密码不正确' });

    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ message: '密码已修改，请重新登录' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/users - 列出所有用户（仅 super_admin）
router.get('/users', authMiddleware, async (req: any, res: Response) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: '仅管理员可查看用户列表' });
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'desc' } });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/users - 管理员新建用户
router.post('/users', authMiddleware, async (req: any, res: Response) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: '仅管理员可创建用户' });
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { username, password, nickname, phone, avatar, role = 'user' } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
    if (!VALID_USER_ROLES.includes(role)) return res.status(400).json({ error: '系统角色无效' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, nickname: nickname || username, phone, avatar, role },
      select: USER_SELECT,
    });
    res.status(201).json(user);
  } catch (error: any) {
    if (error.message?.includes('Unique constraint')) return res.status(409).json({ error: '用户名已存在' });
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/users/:id - 更新用户信息
router.put('/users/:id', authMiddleware, async (req: any, res: Response) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: '仅管理员可编辑用户' });
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = parseInt(req.params.id, 10);
    const { nickname, role, phone, avatar, password } = req.body;
    const data: any = {};
    if (nickname !== undefined) data.nickname = nickname;
    if (phone !== undefined) data.phone = phone;
    if (avatar !== undefined) data.avatar = avatar;
    if (role !== undefined) {
      if (!VALID_USER_ROLES.includes(role)) return res.status(400).json({ error: '系统角色无效' });
      data.role = role;
    }
    if (password !== undefined && password !== '') {
      if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({ where: { id: userId }, data, select: USER_SELECT });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/auth/users/:id - 删除用户
router.delete('/users/:id', authMiddleware, async (req: any, res: Response) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: '仅管理员可删除用户' });
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = parseInt(req.params.id, 10);
    if (userId === req.user.id) return res.status(400).json({ error: '不能删除当前登录用户' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'super_admin') return res.status(400).json({ error: '不能删除超级管理员' });
    await prisma.user.delete({ where: { id: userId } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
