import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { requireLibraryAccess, requireRole } from '../middleware/permission';

const router = Router();

// 查重算法：计算两张卡片的相似度 (0-1)
function calculateSimilarity(a: any, b: any): number {
  let score = 0;
  let total = 0;

  // 手机号相同 +0.5
  total += 0.5;
  if (a.phone && b.phone && a.phone === b.phone) score += 0.5;

  // 姓名相同 +0.3
  total += 0.3;
  if (a.name && b.name && a.name === b.name) score += 0.3;

  // 邮箱相同 +0.2
  total += 0.2;
  if (a.email && b.email && a.email === b.email) score += 0.2;

  if (total === 0) return 0;
  return Math.round((score / total) * 100) / 100;
}

// POST /api/duplicates/:libraryId/detect - 全量查重
router.post('/:libraryId/detect', authMiddleware, requireLibraryAccess, requireRole('manager'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const libraryId = req.libraryId;

    // 获取库内所有卡片
    const cards = await prisma.card.findMany({
      where: { libraryId },
      select: { id: true, name: true, phone: true, email: true },
    });

    const processed = new Set<number>();
    const groupsCreated: number[] = [];

    for (let i = 0; i < cards.length; i++) {
      if (processed.has(cards[i].id)) continue;

      const matches: Array<{ cardId: number; similarity: number }> = [];

      for (let j = i + 1; j < cards.length; j++) {
        if (processed.has(cards[j].id)) continue;

        const sim = calculateSimilarity(cards[i], cards[j]);
        if (sim >= 0.5) {
          matches.push({ cardId: cards[j].id, similarity: sim });
        }
      }

      if (matches.length > 0) {
        processed.add(cards[i].id);
        matches.forEach((m) => processed.add(m.cardId));

        // 创建 DuplicateGroup
        const group = await prisma.duplicateGroup.create({
          data: {
            libraryId,
            status: 'open',
            members: {
              create: [
                { cardId: cards[i].id, similarity: 1.0 },
                ...matches.map((m) => ({ cardId: m.cardId, similarity: m.similarity })),
              ],
            },
          },
        });
        groupsCreated.push(group.id);
      }
    }

    // 如果已有 open 的查重组，不重复创建
    const existingCount = await prisma.duplicateGroup.count({ where: { libraryId, status: 'open' } });

    res.json({
      detected: groupsCreated.length,
      totalGroups: existingCount,
      message: `检测完成，发现 ${groupsCreated.length} 组重复`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/duplicates/:libraryId - 列出查重组
router.get('/:libraryId', authMiddleware, requireLibraryAccess, requireRole('manager'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { status } = req.query;
    const where: any = { libraryId: req.libraryId };
    if (status) where.status = status as string;

    const groups = await prisma.duplicateGroup.findMany({
      where,
      include: {
        members: {
          include: {
            card: { select: { id: true, name: true, phone: true, company: true, position: true, avatar: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/duplicates/:libraryId/groups/:groupId - 查重组详情
router.get('/:libraryId/groups/:groupId', authMiddleware, requireLibraryAccess, requireRole('manager'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const group = await prisma.duplicateGroup.findUnique({
      where: { id: parseInt(req.params.groupId) },
      include: {
        members: {
          include: { card: true },
        },
      },
    });
    if (!group) return res.status(404).json({ error: '查重组不存在' });
    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/duplicates/merge - 执行合并
router.post('/merge', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const { groupId, sourceCardId, targetCardId, fields } = req.body;

    if (!groupId || !sourceCardId || !targetCardId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const source = await prisma.card.findUnique({ where: { id: sourceCardId } });
    const target = await prisma.card.findUnique({ where: { id: targetCardId } });
    if (!source || !target) return res.status(404).json({ error: '名片不存在' });

    // 合并 fields
    const fieldsToMerge = fields || [
      'email', 'company', 'position', 'jobLevel', 'industry', 'field',
      'gender', 'residentialAddress', 'hometownAddress', 'birthplace',
      'wechat', 'qq', 'website', 'linkedin', 'fax', 'remark',
    ];

    const updateData: any = {};
    const merged: string[] = [];

    for (const field of fieldsToMerge) {
      if ((source as any)[field] && !(target as any)[field]) {
        updateData[field] = (source as any)[field];
        merged.push(field);
      }
    }

    // 更新 target 卡片
    if (Object.keys(updateData).length > 0) {
      await prisma.card.update({ where: { id: targetCardId }, data: updateData });
    }

    // 记录合并日志
    await prisma.mergeLog.create({
      data: {
        sourceCardId,
        targetCardId,
        mergedFields: JSON.stringify(merged),
        operatorId: req.user.id,
      },
    });

    // 更新 DuplicateGroup 状态
    await prisma.duplicateGroup.update({
      where: { id: groupId },
      data: { status: 'merged' },
    });

    res.json({
      merged: true,
      targetCardId,
      mergedFields: merged,
      message: `合并完成，共合并 ${merged.length} 个字段`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/duplicates/:libraryId/dismiss/:groupId - 忽略重复
router.post('/:libraryId/dismiss/:groupId', authMiddleware, requireLibraryAccess, requireRole('manager'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    await prisma.duplicateGroup.update({
      where: { id: parseInt(req.params.groupId) },
      data: { status: 'dismissed' },
    });
    res.json({ message: '已忽略该组重复' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/duplicates/:libraryId/stats - 查重统计
router.get('/:libraryId/stats', authMiddleware, requireLibraryAccess, requireRole('manager'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const libraryId = req.libraryId;
    const [open, merged, dismissed] = await Promise.all([
      prisma.duplicateGroup.count({ where: { libraryId, status: 'open' } }),
      prisma.duplicateGroup.count({ where: { libraryId, status: 'merged' } }),
      prisma.duplicateGroup.count({ where: { libraryId, status: 'dismissed' } }),
    ]);
    res.json({ open, merged, dismissed, total: open + merged + dismissed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/duplicates/:cardId/check - 单卡片查重
router.post('/:cardId/check', authMiddleware, async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cardId = parseInt(req.params.cardId);
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ error: '名片不存在' });

    const candidates = await prisma.card.findMany({
      where: {
        libraryId: card.libraryId,
        id: { not: cardId },
      },
      select: { id: true, name: true, phone: true, email: true, company: true, position: true },
    });

    const matches = candidates
      .map((c: any) => ({
        cardId: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        similarity: calculateSimilarity(card, c),
      }))
      .filter((m: any) => m.similarity >= 0.5)
      .sort((a: any, b: any) => b.similarity - a.similarity);

    res.json(matches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
