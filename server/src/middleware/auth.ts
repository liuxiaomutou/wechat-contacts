import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'card-book-secret-key-change-in-production';

export function generateToken(user: { id: number; username: string; role: string }): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded as { id: number; username: string; role: string };
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export { JWT_SECRET };
