import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { requireLibraryAccess, requireRole } from '../middleware/permission';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 导出 CSV
router.get('/:libraryId/csv', authMiddleware, requireLibraryAccess, requireRole('editor'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cards = await prisma.card.findMany({
      where: { libraryId: req.libraryId },
      orderBy: { updatedAt: 'desc' },
    });

    const fields = ['name', 'phone', 'email', 'company', 'position', 'jobLevel', 'industry', 'field', 'gender', 'wechat', 'tags', 'remark'];
    const header = fields.join(',');
    const rows = cards.map((card: any) => {
      return fields.map((f) => {
        const val = (card as any)[f] || '';
        // Escape CSV values
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',');
    });

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=cards-${req.libraryId}-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 导入 CSV
router.post('/:libraryId/csv', authMiddleware, requireLibraryAccess, requireRole('editor'), upload.single('file'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    if (!req.file) return res.status(400).json({ error: '请上传 CSV 文件' });

    const csv = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = csv.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'CSV 文件为空或格式不正确' });

    const headers = parseCSVLine(lines[0]);
    const success: number[] = [];
    const failed: Array<{ row: number; error: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: any = {};
        headers.forEach((h: string, idx: number) => { row[h.trim()] = (values[idx] || '').trim(); });

        if (!row.name) {
          failed.push({ row: i + 1, error: '缺少姓名' });
          continue;
        }

        await prisma.card.create({
          data: {
            name: row.name,
            phone: row.phone || '',
            email: row.email,
            company: row.company,
            position: row.position,
            jobLevel: row.jobLevel,
            industry: row.industry,
            field: row.field,
            gender: row.gender,
            wechat: row.wechat,
            tags: row.tags,
            remark: row.remark,
            libraryId: req.libraryId,
            ownerId: req.user.id,
          },
        });
        success.push(i + 1);
      } catch (err: any) {
        failed.push({ row: i + 1, error: err.message });
      }
    }

    res.json({ success: success.length, failed, total: lines.length - 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 导出 vCard
router.get('/:libraryId/vcard', authMiddleware, requireLibraryAccess, requireRole('editor'), async (req: any, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const cards = await prisma.card.findMany({
      where: { libraryId: req.libraryId },
      orderBy: { updatedAt: 'desc' },
    });

    let vcard = '';
    for (const card of cards) {
      vcard += 'BEGIN:VCARD\nVERSION:3.0\n';
      vcard += `FN:${card.name}\n`;
      vcard += `N:${card.name};;;\n`;
      if (card.phone) vcard += `TEL;TYPE=CELL:${card.phone}\n`;
      if (card.email) vcard += `EMAIL:${card.email}\n`;
      if (card.company) vcard += `ORG:${card.company}\n`;
      if (card.position) vcard += `TITLE:${card.position}\n`;
      if (card.wechat) vcard += `X-SOCIALPROFILE;TYPE=WECHAT:${card.wechat}\n`;
      vcard += `NOTE:${card.remark || ''}\n`;
      vcard += 'END:VCARD\n\n';
    }

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=cards-${req.libraryId}-${Date.now()}.vcf`);
    res.send(vcard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 简单 CSV 行解析（支持引号包裹）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default router;
