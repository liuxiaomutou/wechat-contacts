import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const uploadDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('只能上传图片'));
    cb(null, true);
  },
});

router.post('/image', authMiddleware, upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ error: '缺少图片文件' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ url: `${baseUrl}/uploads/${req.file.filename}` });
});

export default router;
