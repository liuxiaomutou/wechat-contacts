import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { bindWechatOpenid, getOrCreateReminderSetting, scanBirthdayReminders, updateReminderSetting } from '../services/birthdayReminders';
import { parseDaysBefore } from '../utils/birthday';

const router = Router();

function serializeSetting(setting: any) {
  return { ...setting, daysBefore: parseDaysBefore(setting.daysBefore) };
}

router.get('/birthday/settings', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const setting = await getOrCreateReminderSetting(prisma, req.user.id);
    res.json(serializeSetting(setting));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/birthday/settings', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const setting = await updateReminderSetting(prisma, req.user.id, req.body || {});
    res.json(serializeSetting(setting));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wechat/bind', authMiddleware, async (req: any, res: Response) => {
  try {
    if (!req.body?.code) return res.status(400).json({ error: '缺少微信登录 code' });
    const prisma: PrismaClient = req.app.locals.prisma;
    const result = await bindWechatOpenid(prisma, req.user.id, req.body.code);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/birthday/scan', authMiddleware, async (req: any, res: Response) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: '仅管理员可手动扫描生日提醒' });
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const now = req.body?.date ? new Date(req.body.date) : new Date();
    const summary = await scanBirthdayReminders(prisma, { now, dueOnly: false, userId: req.body?.userId });
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/birthday/logs', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const logs = await (prisma as any).birthdayReminderLog.findMany({
      where: { userId: req.user.id },
      include: { card: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
