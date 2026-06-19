import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import contactsRouter from './routes/contacts';
import { groupsRouter } from './routes/groups';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 全局注入 prisma 实例
app.locals.prisma = prisma;

// 路由
app.use('/api/contacts', contactsRouter);
app.use('/api/groups', groupsRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 启动
app.listen(PORT, () => {
  console.log(`📇 通讯录 API 运行在 http://localhost:${PORT}`);
  console.log(`   API 文档: http://localhost:${PORT}/api/health`);
});

// 优雅退出
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
