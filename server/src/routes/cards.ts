import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const ROLE_HIERARCHY: Record<string, number> = { admin: 4, manager: 3, editor: 2, viewer: 1 };
const JSON_FIELDS = ['phones', 'emails', 'educationBackground', 'workExperience', 'socialPositions', 'skills'];
const SIMPLE_FIELDS = [
  'email', 'company', 'position', 'industry', 'field', 'gender',
  'solarBirthday', 'lunarBirthday', 'ethnicity', 'maritalStatus',
  'province', 'city', 'district', 'township', 'detailAddress',
  'residentialAddress', 'hometownAddress', 'birthplace', 'wechat', 'qq',
  'website', 'linkedin', 'fax', 'tags', 'remark', 'avatar', 'isPublic',
];
const DEFAULT_LIBRARY_FIELDS: Record<string, boolean> = {
  avatar: true, company: true, position: true, phone: true, phones: true, email: true, emails: true,
  wechat: true, educationBackground: true, workExperience: true, tags: true, remark: true,
  residentialAddress: false, hometownAddress: false, birthplace: true, qq: false, website: false,
  linkedin: false, fax: false, socialPositions: true, skills: true, industry: true, field: true, gender: true,
  solarBirthday: true, lunarBirthday: true, ethnicity: true, maritalStatus: true,
  province: true, city: true, district: true, township: true, detailAddress: true,
};

function parseJson(value: any, fallback: any = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}
function toJson(value: any) {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value);
}
function normalizeArray(value: any, fallbackSingle?: string) {
  const parsed = parseJson(value, value);
  if (Array.isArray(parsed)) return parsed.filter(Boolean);
  if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
  return fallbackSingle ? [fallbackSingle] : [];
}
function parseFieldSettings(library: any) {
  return { ...DEFAULT_LIBRARY_FIELDS, ...(parseJson(library?.fieldSettings, {}) || {}) };
}
function roleForCard(card: any, user: any, member: any) {
  if (user.role === 'super_admin' || card.library?.ownerId === user.id) return 'admin';
  if (card.ownerId === user.id) return 'editor';
  return member?.role || '';
}
function actionFlags(role: string, isOwner: boolean) {
  return {
    canView: ROLE_HIERARCHY[role] >= 1 || isOwner,
    canEdit: ['admin', 'manager', 'editor'].includes(role) || isOwner,
    canDelete: ['admin', 'manager'].includes(role) || isOwner,
    canManageVisibility: ['admin', 'manager'].includes(role) || isOwner,
  };
}
function serializeCard(card: any, role = 'viewer', currentUserId?: number) {
  const result: any = { ...card };
  for (const field of JSON_FIELDS) result[field] = parseJson(result[field], field === 'skills' ? [] : []);
  result.phones = normalizeArray(result.phones, result.phone);
  result.emails = normalizeArray(result.emails, result.email || undefined);
  if (!result.phone && result.phones.length) result.phone = result.phones[0];
  if (!result.email && result.emails.length) result.email = result.emails[0];

  const settings = parseFieldSettings(card.library);
  const perCardVis: Record<string, string> = {};
  (card.fieldVisibilities || []).forEach((v: any) => { perCardVis[v.fieldName] = v.visibility; });
  const isOwner = currentUserId ? result.ownerId === currentUserId : false;
  const isPrivileged = ['admin', 'manager'].includes(role) || isOwner;
  if (!isPrivileged) {
    for (const [field, enabled] of Object.entries(settings)) {
      if (!enabled) delete result[field];
    }
    for (const [field, vis] of Object.entries(perCardVis)) {
      if (vis === 'hidden' || vis === 'admin_only') delete result[field];
    }
  }
  delete result.library?.fieldSettings;
  result.role = role || 'viewer';
  result.actions = actionFlags(role, isOwner);
  return result;
}
async function getLibraryRole(prisma: PrismaClient, user: any, libraryId: number) {
  if (user.role === 'super_admin') return 'admin';
  const lib = await prisma.cardLibrary.findUnique({ where: { id: libraryId }, select: { ownerId: true } });
  if (lib?.ownerId === user.id) return 'admin';
  const member = await prisma.libraryMember.findUnique({ where: { libraryId_userId: { libraryId, userId: user.id } } });
  return member?.role || '';
}
async function ensureCanWrite(prisma: PrismaClient, user: any, libraryId: number, roles = ['admin', 'manager', 'editor']) {
  const role = await getLibraryRole(prisma, user, libraryId);
  return roles.includes(role);
}
function buildCardData(body: any, ownerId?: number) {
  const { libraryId, name, phone, phones, email, emails, ...rest } = body;
  const data: any = {};
  if (libraryId !== undefined) data.libraryId = parseInt(libraryId, 10);
  if (ownerId !== undefined) data.ownerId = ownerId;
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (phones !== undefined) {
    data.phones = toJson(phones);
    if (!data.phone && Array.isArray(phones) && phones[0]) data.phone = phones[0];
  }
  if (email !== undefined) data.email = email;
  if (emails !== undefined) {
    data.emails = toJson(emails);
    if (!data.email && Array.isArray(emails) && emails[0]) data.email = emails[0];
  }
  for (const field of ['educationBackground', 'workExperience', 'socialPositions', 'skills']) {
    if (rest[field] !== undefined) data[field] = toJson(rest[field]);
  }
  for (const f of SIMPLE_FIELDS) if (rest[f] !== undefined) data[f] = rest[f];
  return data;
}

// GET /api/cards
router.get('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const userId = req.user.id;
    const { libraryId, search, groupId, page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const where: any = {};
    let userRole = req.user.role === 'super_admin' ? 'admin' : 'viewer';

    if (libraryId) {
      const libId = parseInt(libraryId as string, 10);
      userRole = await getLibraryRole(prisma, req.user, libId);
      if (!userRole) return res.status(403).json({ error: '没有该名片库的访问权限' });
      where.libraryId = libId;
      if (!['admin', 'manager'].includes(userRole)) where.OR = [{ isPublic: true }, { ownerId: userId }];
    } else if (req.user.role !== 'super_admin') {
      const [memberLibs, ownedLibs] = await Promise.all([
        prisma.libraryMember.findMany({ where: { userId }, select: { libraryId: true } }),
        prisma.cardLibrary.findMany({ where: { ownerId: userId }, select: { id: true } }),
      ]);
      const libIds = [...new Set([...memberLibs.map(m => m.libraryId), ...ownedLibs.map(l => l.id)])];
      if (!libIds.length) return res.json({ data: [], total: 0, page: pageNum, pageSize: pageSizeNum });
      where.libraryId = { in: libIds };
    }

    if (search) {
      const s = search as string;
      where.AND = [...(where.AND || []), { OR: [
        { name: { contains: s } }, { phone: { contains: s } }, { phones: { contains: s } },
        { company: { contains: s } }, { position: { contains: s } }, { email: { contains: s } },
        { emails: { contains: s } }, { wechat: { contains: s } }, { tags: { contains: s } },
      ] }];
    }
    if (groupId) where.groups = { some: { groupId: parseInt(groupId as string, 10) } };

    const [total, data] = await Promise.all([
      prisma.card.count({ where }),
      prisma.card.findMany({ where, skip: (pageNum - 1) * pageSizeNum, take: pageSizeNum, orderBy: [{ updatedAt: 'desc' }], include: { library: true, fieldVisibilities: true } }),
    ]);
    res.json({ data: data.map(c => serializeCard(c, userRole, userId)), total, page: pageNum, pageSize: pageSizeNum });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// GET /api/cards/:id
router.get('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const card = await prisma.card.findUnique({ where: { id: parseInt(req.params.id) }, include: { library: true, fieldVisibilities: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });
    const member = await prisma.libraryMember.findUnique({ where: { libraryId_userId: { libraryId: card.libraryId, userId: req.user.id } } }).catch(() => null);
    const role = roleForCard(card, req.user, member);
    if (!role && card.ownerId !== req.user.id) return res.status(403).json({ error: '无权查看该名片' });
    if (!['admin', 'manager'].includes(role) && card.ownerId !== req.user.id && !card.isPublic) return res.status(403).json({ error: '无权查看该名片' });
    res.json(serializeCard(card, role, req.user.id));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /api/cards
router.post('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const libraryId = parseInt(req.body.libraryId, 10);
    if (!libraryId) return res.status(400).json({ error: '缺少名片库 ID' });
    if (!req.body.name) return res.status(400).json({ error: '姓名不能为空' });
    if (!(await ensureCanWrite(prisma, req.user, libraryId))) return res.status(403).json({ error: '没有编辑权限' });
    const data = buildCardData(req.body, req.user.id);
    if (!data.phone) data.phone = '';
    const card = await prisma.card.create({ data, include: { library: true, fieldVisibilities: true } });
    res.status(201).json(serializeCard(card, 'editor', req.user.id));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// PUT /api/cards/:id
router.put('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id, 10);
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { id: true, ownerId: true, libraryId: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });
    const canEdit = card.ownerId === req.user.id || await ensureCanWrite(prisma, req.user, card.libraryId);
    if (!canEdit) return res.status(403).json({ error: '没有编辑权限' });
    const updated = await prisma.card.update({ where: { id: cardId }, data: buildCardData(req.body), include: { library: true, fieldVisibilities: true } });
    res.json(serializeCard(updated, await getLibraryRole(prisma, req.user, updated.libraryId), req.user.id));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// DELETE /api/cards/:id
router.delete('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id, 10);
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { libraryId: true, ownerId: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });
    const role = await getLibraryRole(prisma, req.user, card.libraryId);
    const canDelete = card.ownerId === req.user.id || ['admin', 'manager'].includes(role);
    if (!canDelete) return res.status(403).json({ error: '没有删除权限' });
    await prisma.card.delete({ where: { id: cardId } });
    res.status(204).send();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// GET /api/cards/:id/visibility
router.get('/:id/visibility', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id, 10);
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { ownerId: true, libraryId: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });
    const role = await getLibraryRole(prisma, req.user, card.libraryId);
    if (card.ownerId !== req.user.id && !['admin', 'manager'].includes(role)) return res.status(403).json({ error: '无权查看字段设置' });
    res.json(await prisma.cardFieldVisibility.findMany({ where: { cardId } }));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// PUT /api/cards/:id/visibility
router.put('/:id/visibility', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.id, 10);
    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { ownerId: true, libraryId: true } });
    if (!card) return res.status(404).json({ error: '名片不存在' });
    const role = await getLibraryRole(prisma, req.user, card.libraryId);
    if (card.ownerId !== req.user.id && !['admin', 'manager'].includes(role)) return res.status(403).json({ error: '无权设置字段可见性' });
    const { fields } = req.body;
    if (!Array.isArray(fields)) return res.status(400).json({ error: 'fields 必须是数组' });
    for (const f of fields) {
      if (!f.fieldName || !['public', 'hidden', 'admin_only'].includes(f.visibility)) continue;
      await prisma.cardFieldVisibility.upsert({
        where: { cardId_fieldName: { cardId, fieldName: f.fieldName } },
        update: { visibility: f.visibility },
        create: { cardId, fieldName: f.fieldName, visibility: f.visibility },
      });
    }
    res.json(await prisma.cardFieldVisibility.findMany({ where: { cardId } }));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default router;
