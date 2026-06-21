import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth';
import librariesRouter from './routes/libraries';
import cardsRouter from './routes/cards';
import duplicatesRouter from './routes/duplicates';
import exportRouter from './routes/exportImport';
import uploadsRouter from './routes/uploads';
import remindersRouter from './routes/reminders';
import { startBirthdayReminderScheduler } from './services/birthdayReminders';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

app.locals.prisma = prisma;

app.use('/api/auth', authRouter);
app.use('/api/libraries', librariesRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/duplicates', duplicatesRouter);
app.use('/api/export', exportRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/reminders', remindersRouter);

const birthdayReminderTimer = startBirthdayReminderScheduler(prisma);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`📇 名片库 API 运行在 http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  clearInterval(birthdayReminderTimer);
  await prisma.$disconnect();
  process.exit(0);
});
