import { PrismaClient } from '@prisma/client';
import { getBirthdayReminderMatches, parseDaysBefore } from '../utils/birthday';

type ScanOptions = { now?: Date; dueOnly?: boolean; userId?: number };
type SendResult = { status: 'sent' | 'failed' | 'skipped'; error?: string };

const ACCESS_TOKEN_CACHE: { token?: string; expiresAt?: number } = {};

function minutesOf(time: string | null | undefined) {
  const m = String(time || '09:00').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 9 * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}

function isDue(setting: any, now: Date) {
  const current = now.getHours() * 60 + now.getMinutes();
  const target = minutesOf(setting.reminderTime);
  return current >= target && current < target + 15;
}

async function getAccessToken(): Promise<string | null> {
  const appid = process.env.WECHAT_MINI_APPID;
  const secret = process.env.WECHAT_MINI_SECRET;
  if (!appid || !secret) return null;
  if (ACCESS_TOKEN_CACHE.token && ACCESS_TOKEN_CACHE.expiresAt && ACCESS_TOKEN_CACHE.expiresAt > Date.now() + 60_000) return ACCESS_TOKEN_CACHE.token;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`;
  const res = await fetch(url);
  const data: any = await res.json();
  if (!data.access_token) throw new Error(data.errmsg || '获取微信 access_token 失败');
  ACCESS_TOKEN_CACHE.token = data.access_token;
  ACCESS_TOKEN_CACHE.expiresAt = Date.now() + (Number(data.expires_in || 7200) - 300) * 1000;
  return data.access_token;
}

async function sendSubscribeMessage(user: any, setting: any, match: any): Promise<SendResult> {
  const templateId = setting.subscribeTemplateId || process.env.WECHAT_BIRTHDAY_TEMPLATE_ID;
  if (!templateId) return { status: 'skipped', error: '未配置订阅消息模板 ID' };
  if (!user.wxOpenid) return { status: 'skipped', error: '用户未绑定微信 openid' };
  try {
    const token = await getAccessToken();
    if (!token) return { status: 'skipped', error: '未配置 WECHAT_MINI_APPID / WECHAT_MINI_SECRET' };
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: user.wxOpenid,
        template_id: templateId,
        page: `/pages/card-detail/index?id=${match.cardId}`,
        data: {
          thing1: { value: match.cardName.slice(0, 20) },
          date2: { value: match.birthdayDate },
          thing3: { value: match.daysBefore === 0 ? '今天生日' : `${match.daysBefore}天后生日` },
        },
      }),
    });
    const data: any = await res.json();
    if (data.errcode === 0) return { status: 'sent' };
    return { status: 'failed', error: data.errmsg || JSON.stringify(data) };
  } catch (error: any) {
    return { status: 'failed', error: error.message || String(error) };
  }
}

export async function bindWechatOpenid(prisma: PrismaClient, userId: number, code: string) {
  const appid = process.env.WECHAT_MINI_APPID;
  const secret = process.env.WECHAT_MINI_SECRET;
  if (!appid || !secret) throw new Error('未配置 WECHAT_MINI_APPID / WECHAT_MINI_SECRET');
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data: any = await res.json();
  if (!data.openid) throw new Error(data.errmsg || '微信登录凭证换取 openid 失败');
  await (prisma as any).user.update({ where: { id: userId }, data: { wxOpenid: data.openid } });
  return { bound: true };
}

export async function getOrCreateReminderSetting(prisma: PrismaClient, userId: number) {
  const existing = await (prisma as any).birthdayReminderSetting.findUnique({ where: { userId } });
  if (existing) return existing;
  return (prisma as any).birthdayReminderSetting.create({ data: { userId } });
}

export async function updateReminderSetting(prisma: PrismaClient, userId: number, input: any) {
  const days = input.daysBefore !== undefined ? parseDaysBefore(input.daysBefore) : undefined;
  const data: any = {};
  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
  if (days) data.daysBefore = JSON.stringify(days);
  if (input.reminderTime !== undefined) data.reminderTime = String(input.reminderTime || '09:00');
  if (input.subscribeTemplateId !== undefined) data.subscribeTemplateId = input.subscribeTemplateId || null;
  await getOrCreateReminderSetting(prisma, userId);
  return (prisma as any).birthdayReminderSetting.update({ where: { userId }, data });
}

async function visibleCardsForUser(prisma: PrismaClient, userId: number) {
  return (prisma as any).card.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { library: { ownerId: userId } },
        { library: { members: { some: { userId } } } },
      ],
    },
    select: { id: true, name: true, solarBirthday: true, lunarBirthday: true },
  });
}

export async function scanBirthdayReminders(prisma: PrismaClient, options: ScanOptions = {}) {
  const now = options.now || new Date();
  const where: any = { enabled: true };
  if (options.userId) where.userId = options.userId;
  const settings = await (prisma as any).birthdayReminderSetting.findMany({ where, include: { user: true } });
  const summary = { checkedUsers: settings.length, matched: 0, created: 0, skippedExisting: 0, sent: 0, failed: 0, skipped: 0, logs: [] as any[] };
  for (const setting of settings) {
    if (options.dueOnly && !isDue(setting, now)) continue;
    const cards = await visibleCardsForUser(prisma, setting.userId);
    const matches = getBirthdayReminderMatches(cards, now, parseDaysBefore(setting.daysBefore));
    summary.matched += matches.length;
    for (const match of matches) {
      const remindKey = `${setting.userId}-${match.cardId}-${match.birthdayType}-${match.birthdayDate}-${match.daysBefore}`;
      const existing = await (prisma as any).birthdayReminderLog.findUnique({ where: { remindKey } });
      if (existing) { summary.skippedExisting += 1; continue; }
      const send = await sendSubscribeMessage(setting.user, setting, match);
      const log = await (prisma as any).birthdayReminderLog.create({
        data: {
          userId: setting.userId,
          cardId: match.cardId,
          birthdayType: match.birthdayType,
          birthdayDate: match.birthdayDate,
          daysBefore: match.daysBefore,
          remindKey,
          status: send.status,
          error: send.error,
          sentAt: send.status === 'sent' ? new Date() : null,
        },
      });
      summary.created += 1;
      summary[send.status] += 1;
      summary.logs.push(log);
    }
  }
  return summary;
}

export function startBirthdayReminderScheduler(prisma: PrismaClient) {
  const run = () => scanBirthdayReminders(prisma, { dueOnly: true }).catch(err => console.error('生日提醒扫描失败:', err));
  const timer = setInterval(run, 10 * 60 * 1000);
  return timer;
}
