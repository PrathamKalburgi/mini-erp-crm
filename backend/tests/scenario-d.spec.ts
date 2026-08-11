import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/main';

describe('Scenario D: Insufficient Stock Prevention & Rollback', () => {
  let salesToken: string;
  let warehouseToken: string;
  let productCId: number;
  let challanId: number;

  const skuC = `SKU-SCENARIO-D-${Date.now()}`;

  beforeAll(async () => {
    const sRes = await request(app).post('/auth/login').send({ email: 'sales@fundsroom.com', password: 'Sales@123' });
    salesToken = sRes.body.access_token;

    const wRes = await request(app).post('/auth/login').send({ email: 'warehouse@fundsroom.com', password: 'Warehouse@123' });
    warehouseToken = wRes.body.access_token;

    // Setup Product C with current_stock = 2
    const pCRes = await request(app).post('/products').set('Authorization', `Bearer ${warehouseToken}`).send({
      product_name: 'Scenario D Product C', sku: skuC, category: 'Hardware', unit_price: 300, current_stock: 0, minimum_stock_alert_quantity: 1, warehouse_location: 'Rack D1',
    });
    productCId = pCRes.body.data.id;
    await request(app).patch(`/products/${productCId}`).set('Authorization', `Bearer ${warehouseToken}`).send({ current_stock: 2, reason: 'Initial setup' });
  });

  it('1. Create Draft Challan requesting Product C (qty=5) when available stock is 2', async () => {
    const res = await request(app)
      .post('/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: 1,
        items: [{ product_id: productCId, quantity: 5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    challanId = res.body.data.id;
  });

  it('2. Confirming challan with insufficient stock returns 409 INSUFFICIENT_STOCK with details', async () => {
    const res = await request(app)
      .post(`/challans/${challanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details).toBeDefined();

    const detail = res.body.error.details[0];
    expect(detail.meta).toEqual({
      product_id: productCId,
      requested_quantity: 5,
      available_quantity: 2,
    });
  });

  it('3. Verify complete transaction rollback: stock remains 2, status remains DRAFT, 0 OUT movements created', async () => {
    // Check product stock
    const pC = await request(app).get(`/products/${productCId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(pC.body.data.current_stock).toBe(2);

    // Check challan status
    const cRes = await request(app).get(`/challans/${challanId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(cRes.body.data.status).toBe('DRAFT');

    // Check stock movements for product C (only the initial setup IN movement exists)
    const movRes = await request(app).get(`/stock-movements?product_id=${productCId}`).set('Authorization', `Bearer ${salesToken}`);
    const outMovements = movRes.body.data.filter((m: { movement_type: string }) => m.movement_type === 'OUT');
    expect(outMovements).toHaveLength(0);
  });
});
