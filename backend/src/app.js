import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { orderRouter } from './routes/orders.js';
import { workflowRouter } from './routes/workflow.js';

export const app = express();

const allowedOrigins = new Set([
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'erp-api' });
});

app.use('/api/auth', authRouter);
app.use('/api', catalogRouter);
app.use('/api/orders', orderRouter);
app.use('/api', workflowRouter);

app.use((_request, response) => response.status(404).json({ message: 'Route not found' }));

app.use((error, _request, response, _next) => {
  if (error?.name === 'ZodError') return response.status(400).json({ message: 'Validation failed', issues: error.issues });
  if (error?.code === '23505') return response.status(409).json({ message: 'A record with this value already exists' });
  if (error?.code === '23503') return response.status(409).json({ message: 'This record is still referenced by another record' });
  const status = error.status || 500;
  response.status(status).json({ message: error.message || 'Unexpected server error' });
});
