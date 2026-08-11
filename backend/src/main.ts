import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRouter from './modules/auth/auth.router';
import customerRouter from './modules/customer/customer.router';
import productRouter from './modules/product/product.router';
import inventoryRouter from './modules/inventory/inventory.router';
import challanRouter from './modules/challan/challan.router';
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

// Authentication Module Routes (CONTRACTS.md Section 3)
app.use('/auth', authRouter);

// Customer CRM Module Routes (CONTRACTS.md Section 4)
app.use('/customers', customerRouter);

// Product Catalog Module Routes (CONTRACTS.md Section 4)
app.use('/products', productRouter);

// Stock Movement Audit Log Routes (CONTRACTS.md Section 4)
app.use('/stock-movements', inventoryRouter);

// Sales Challan Module Routes (CONTRACTS.md Section 4)
app.use('/challans', challanRouter);

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
