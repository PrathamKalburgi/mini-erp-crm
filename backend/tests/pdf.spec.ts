import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/main';

describe('Bonus 2: Sales Challan PDF Export', () => {
  let salesToken: string;
  let warehouseToken: string;
  let productId: number;
  let challanId: number;

  const sku = `SKU-PDF-${Date.now()}`;

  beforeAll(async () => {
    const sRes = await request(app).post('/auth/login').send({ email: 'sales@fundsroom.com', password: 'Sales@123' });
    salesToken = sRes.body.access_token;

    const wRes = await request(app).post('/auth/login').send({ email: 'warehouse@fundsroom.com', password: 'Warehouse@123' });
    warehouseToken = wRes.body.access_token;

    const pRes = await request(app).post('/products').set('Authorization', `Bearer ${warehouseToken}`).send({
      product_name: 'PDF Test Pipe',
      sku: sku,
      category: 'Hardware',
      unit_price: 120.5,
      current_stock: 0,
      minimum_stock_alert_quantity: 5,
      warehouse_location: 'Bay P1',
    });
    productId = pRes.body.data.id;
    await request(app).patch(`/products/${productId}`).set('Authorization', `Bearer ${warehouseToken}`).send({ current_stock: 50, reason: 'Initial setup' });

    const cRes = await request(app)
      .post('/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: 1,
        items: [{ product_id: productId, quantity: 4 }],
      });

    challanId = cRes.body.data.id;
  });

  it('GET /challans/:id/pdf returns 200 OK with application/pdf Content-Type', async () => {
    const res = await request(app)
      .get(`/challans/${challanId}/pdf`)
      .set('Authorization', `Bearer ${salesToken}`)
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`attachment; filename="challan-${challanId}.pdf"`);
    expect(res.body).toBeDefined();
    expect(res.body.length).toBeGreaterThan(100);
  });

  it('GET /challans/999999/pdf returns 404 CHALLAN_NOT_FOUND for non-existent ID', async () => {
    const res = await request(app)
      .get('/challans/999999/pdf')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CHALLAN_NOT_FOUND');
  });

  it('GET /challans/:id/pdf without token returns 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get(`/challans/${challanId}/pdf`);
    expect(res.status).toBe(401);
  });
});
