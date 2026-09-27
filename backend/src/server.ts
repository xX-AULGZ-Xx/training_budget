import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import termsRouter from './routes/terms';
import departmentsRouter from './routes/departments';
import groupsRouter from './routes/groups';
import allocationsRouter from './routes/allocations';
import summaryRouter from './routes/summary';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/terms', termsRouter);
app.use('/api/v1/departments', departmentsRouter);
app.use('/api/v1/groups', groupsRouter);
app.use('/api/v1/allocations', allocationsRouter);
app.use('/api/v1/summary', summaryRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/settings', settingsRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Training Budget Server running on http://localhost:${PORT}`);
});
