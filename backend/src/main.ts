import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './utils/errors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Operational Health Check Endpoint (CONTRACTS.md Section 3)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api',
  });
});

// 404 Handler for unmatched routes
app.use((_req, _res, next) => {
  next(new NotFoundError('The requested endpoint was not found on this server', 'NOT_FOUND'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[API] FundsRoom Mini ERP + CRM Server running on port ${PORT}`);
  });
}

export default app;
