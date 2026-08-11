import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/main';

describe('Scenario A: Authentication & RBAC Isolation', () => {
  let adminToken: string;
  let salesToken: string;
  let warehouseToken: string;
  let accountsToken: string;

  beforeAll(async () => {
    // Obtain tokens for all 4 roles
    const adminRes = await request(app).post('/auth/login').send({ email: 'admin@fundsroom.com', password: 'Admin@123' });
    adminToken = adminRes.body.access_token;

    const salesRes = await request(app).post('/auth/login').send({ email: 'sales@fundsroom.com', password: 'Sales@123' });
    salesToken = salesRes.body.access_token;

    const whRes = await request(app).post('/auth/login').send({ email: 'warehouse@fundsroom.com', password: 'Warehouse@123' });
    warehouseToken = whRes.body.access_token;

    const accRes = await request(app).post('/auth/login').send({ email: 'accounts@fundsroom.com', password: 'Accounts@123' });
    accountsToken = accRes.body.access_token;
  });

  it('1. Login returns JWT token and public user profile for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'sales@fundsroom.com', password: 'Sales@123' });

    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe('Bearer');
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      email: 'sales@fundsroom.com',
      role: 'SALES',
    });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('2. Invalid password returns 401 with code INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'sales@fundsroom.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('3. SALES token requesting POST /products returns 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        product_name: 'Test Pipe',
        sku: 'TEST-PIPE-99',
        category: 'Hardware',
        unit_price: 100,
        current_stock: 0,
        minimum_stock_alert_quantity: 5,
        warehouse_location: 'Bay 1',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('4. WAREHOUSE token requesting POST /challans returns 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/challans')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        customer_id: 1,
        items: [{ product_id: 1, quantity: 1 }],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('5. ACCOUNTS token requesting POST /customers returns 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${accountsToken}`)
      .send({
        customer_name: 'Test Customer',
        mobile_number: '+919999999999',
        email: 'test@example.com',
        business_name: 'Test Business',
        customer_type: 'RETAIL',
        address: '123 Test St',
        status: 'ACTIVE',
        follow_up_date: '2026-09-01',
        notes: '',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('6. GET /auth/me returns current user for valid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('7. Unauthenticated request returns 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
