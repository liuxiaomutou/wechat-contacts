import { PrismaClient } from '@prisma/client';

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  manager: 3,
  editor: 2,
  viewer: 1,
};

export async function requireLibraryAccess(req: any, res: any, next: any) {
  const prisma: PrismaClient = req.app.locals.prisma;
  const libraryId = parseInt(req.params.libraryId || req.body.libraryId || req.query.libraryId, 10);

  if (!libraryId || isNaN(libraryId)) {
    return res.status(400).json({ error: '缺少有效的名片库 ID' });
  }

  // super_admin 自动拥有 admin 权限
  if (req.user.role === 'super_admin') {
    req.libraryRole = 'admin';
    req.libraryId = libraryId;
    return next();
  }

  // 检查是否是库的 owner
  const lib = await prisma.cardLibrary.findUnique({
    where: { id: libraryId },
    select: { ownerId: true },
  });
  if (!lib) {
    return res.status(404).json({ error: '名片库不存在' });
  }
  if (lib.ownerId === req.user.id) {
    req.libraryRole = 'admin';
    req.libraryId = libraryId;
    return next();
  }

  // 检查 member 权限
  const member = await prisma.libraryMember.findUnique({
    where: { libraryId_userId: { libraryId, userId: req.user.id } },
  });

  if (!member) {
    return res.status(403).json({ error: '没有该名片库的访问权限' });
  }

  req.libraryRole = member.role;
  req.libraryId = libraryId;
  next();
}

export function requireRole(minRole: string) {
  return (req: any, res: any, next: any) => {
    const userLevel = ROLE_HIERARCHY[req.libraryRole || ''] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;
    if (userLevel < minLevel) {
      return res.status(403).json({ error: '权限不足，需要 ' + minRole + ' 及以上角色' });
    }
    next();
  };
}
