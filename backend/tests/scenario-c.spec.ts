import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/main';

describe('Scenario C: Challan Confirmation & Inventory Transaction', () => {
  let salesToken: string;
  let warehouseToken: string;
  let productAId: number;
  let productBId: number;
  let challanId: number;

  const skuA = `SKU-SCENARIO-CA-${Date.now()}`;
  const skuB = `SKU-SCENARIO-CB-${Date.now()}`;

  beforeAll(async () => {
    const sRes = await request(app).post('/auth/login').send({ email: 'sales@fundsroom.com', password: 'Sales@123' });
    salesToken = sRes.body.access_token;

    const wRes = await request(app).post('/auth/login').send({ email: 'warehouse@fundsroom.com', password: 'Warehouse@123' });
    warehouseToken = wRes.body.access_token;

    // 1. Setup Product A (stock = 10)
    const pARes = await request(app).post('/products').set('Authorization', `Bearer ${warehouseToken}`).send({
      product_name: 'Scenario C Product A', sku: skuA, category: 'Hardware', unit_price: 100, current_stock: 0, minimum_stock_alert_quantity: 2, warehouse_location: 'Rack C1',
    });
    productAId = pARes.body.data.id;
    await request(app).patch(`/products/${productAId}`).set('Authorization', `Bearer ${warehouseToken}`).send({ current_stock: 10, reason: 'Initial setup' });

    // Setup Product B (stock = 5)
    const pBRes = await request(app).post('/products').set('Authorization', `Bearer ${warehouseToken}`).send({
      product_name: 'Scenario C Product B', sku: skuB, category: 'Hardware', unit_price: 200, current_stock: 0, minimum_stock_alert_quantity: 1, warehouse_location: 'Rack C2',
    });
    productBId = pBRes.body.data.id;
    await request(app).patch(`/products/${productBId}`).set('Authorization', `Bearer ${warehouseToken}`).send({ current_stock: 5, reason: 'Initial setup' });
  });

  it('1. Create Challan Draft for Customer 1 with Product A (qty=3) and Product B (qty=2)', async () => {
    const res = await request(app)
      .post('/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: 1,
        items: [
          { product_id: productAId, quantity: 3 },
          { product_id: productBId, quantity: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.challan_number).toMatch(/^CHL-\d{6}$/);
    expect(res.body.data.total_quantity).toBe(5);
    expect(res.body.data.items).toHaveLength(2);

    // Verify snapshot fields
    const itemA = res.body.data.items.find((i: { product_id: number }) => i.product_id === productAId);
    expect(itemA.snapshot_product_name).toBe('Scenario C Product A');
    expect(itemA.snapshot_sku).toBe(skuA);

    challanId = res.body.data.id;

    // Verify stocks remain 10 and 5 while in DRAFT
    const pA = await request(app).get(`/products/${productAId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(pA.body.data.current_stock).toBe(10);
    const pB = await request(app).get(`/products/${productBId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(pB.body.data.current_stock).toBe(5);
  });

  it('2. POST /challans/:id/confirm transitions status to CONFIRMED and decrements stock', async () => {
    const res = await request(app)
      .post(`/challans/${challanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');

    // Verify Product A stock is now 7 (10 - 3)
    const pA = await request(app).get(`/products/${productAId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(pA.body.data.current_stock).toBe(7);

    // Verify Product B stock is now 3 (5 - 2)
    const pB = await request(app).get(`/products/${productBId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(pB.body.data.current_stock).toBe(3);

    // Verify 2 OUT stock movement rows created with sales_challan_id
    const movARes = await request(app).get(`/stock-movements?product_id=${productAId}`).set('Authorization', `Bearer ${salesToken}`);
    const outA = movARes.body.data.find((m: { sales_challan_id: number }) => m.sales_challan_id === challanId);
    expect(outA).toBeDefined();
    expect(outA.movement_type).toBe('OUT');
    expect(outA.quantity_changed).toBe(3);

    const movBRes = await request(app).get(`/stock-movements?product_id=${productBId}`).set('Authorization', `Bearer ${salesToken}`);
    const outB = movBRes.body.data.find((m: { sales_challan_id: number }) => m.sales_challan_id === challanId);
    expect(outB).toBeDefined();
    expect(outB.movement_type).toBe('OUT');
    expect(outB.quantity_changed).toBe(2);
  });

  it('3. Re-confirming confirmed challan fails with 409 CHALLAN_ALREADY_CONFIRMED without double deduction', async () => {
    const res = await request(app)
      .post(`/challans/${challanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHALLAN_ALREADY_CONFIRMED');

    // Verify stock remains 7 and 3
    const pA = await request(app).get(`/products/${productAId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(pA.body.data.current_stock).toBe(7);
    const pB = await request(app).get(`/products/${productBId}`).set('Authorization', `Bearer ${salesToken}`);
    expect(pB.body.data.current_stock).toBe(3);
  });

  it('4. Modifying or cancelling confirmed challan fails with 409 INVALID_CHALLAN_STATE', async () => {
    const editRes = await request(app)
      .patch(`/challans/${challanId}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ items: [{ product_id: productAId, quantity: 1 }] });

    expect(editRes.status).toBe(409);
    expect(editRes.body.error.code).toBe('INVALID_CHALLAN_STATE');

    const cancelRes = await request(app)
      .post(`/challans/${challanId}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({});

    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.error.code).toBe('INVALID_CHALLAN_STATE');
  });
});
