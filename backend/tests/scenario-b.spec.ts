import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/main';

describe('Scenario B: Inventory Audit & Stock Adjustment', () => {
  let warehouseToken: string;
  let productId: number;
  const uniqueSku = `SKU-SCENARIO-B-${Date.now()}`;

  beforeAll(async () => {
    const whRes = await request(app).post('/auth/login').send({ email: 'warehouse@fundsroom.com', password: 'Warehouse@123' });
    warehouseToken = whRes.body.access_token;
  });

  it('1. Create product with current_stock = 0 succeeds', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Scenario B Test Product',
        sku: uniqueSku,
        category: 'Test Category',
        unit_price: 150.0,
        current_stock: 0,
        minimum_stock_alert_quantity: 10,
        warehouse_location: 'Warehouse Rack B',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.current_stock).toBe(0);
    productId = res.body.data.id;
  });

  it('2. PATCH /products/:id with current_stock = 50 and reason updates stock and logs IN movement', async () => {
    const res = await request(app)
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        current_stock: 50,
        reason: 'Initial shipment arrival',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.current_stock).toBe(50);

    // Verify stock movement entry
    const movRes = await request(app)
      .get(`/stock-movements?product_id=${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);

    expect(movRes.status).toBe(200);
    expect(movRes.body.data.length).toBe(1);
    expect(movRes.body.data[0]).toMatchObject({
      product_id: productId,
      movement_type: 'IN',
      quantity_changed: 50,
      reason: 'Initial shipment arrival',
      sales_challan_id: null,
    });
  });

  it('3. PATCH /products/:id changing stock WITHOUT reason fails with 422 STOCK_CHANGE_REASON_REQUIRED', async () => {
    const res = await request(app)
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        current_stock: 100,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STOCK_CHANGE_REASON_REQUIRED');

    // Verify stock remains unchanged at 50
    const prodRes = await request(app)
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);

    expect(prodRes.body.data.current_stock).toBe(50);

    // Verify no new stock movement was created
    const movRes = await request(app)
      .get(`/stock-movements?product_id=${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);

    expect(movRes.body.data.length).toBe(1);
  });

  it('4. PATCH /products/:id to negative stock fails with 422 NEGATIVE_STOCK_NOT_ALLOWED', async () => {
    const res = await request(app)
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        current_stock: -5,
        reason: 'Faulty correction',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NEGATIVE_STOCK_NOT_ALLOWED');
  });

  it('5. Creating product with duplicate SKU fails with 409 SKU_ALREADY_EXISTS', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Duplicate SKU Product',
        sku: uniqueSku,
        category: 'Test',
        unit_price: 50.0,
        current_stock: 0,
        minimum_stock_alert_quantity: 5,
        warehouse_location: 'Rack A',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SKU_ALREADY_EXISTS');
  });
});
