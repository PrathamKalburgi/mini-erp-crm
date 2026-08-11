import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/main';

describe('Customer CRM API', () => {
  let salesToken: string;
  let customerId: number;

  beforeAll(async () => {
    const res = await request(app).post('/auth/login').send({ email: 'sales@fundsroom.com', password: 'Sales@123' });
    salesToken = res.body.access_token;
  });

  it('POST /customers creates a new customer', async () => {
    const res = await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_name: 'Metro Wholesale',
        mobile_number: '+919123456789',
        email: 'metro@example.com',
        business_name: 'Metro Wholesale Ltd',
        gst_number: '27ABCDE1234F1Z5',
        customer_type: 'WHOLESALE',
        address: '456 Commercial Road, Mumbai',
        status: 'ACTIVE',
        follow_up_date: '2026-09-15',
        notes: 'Premium partner',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.customer_name).toBe('Metro Wholesale');
    customerId = res.body.data.id;
  });

  it('GET /customers returns paginated list with filter & search', async () => {
    const res = await request(app)
      .get('/customers?search=Metro&status=ACTIVE')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      page_size: 20,
    });
  });

  it('GET /customers/:id returns single customer', async () => {
    const res = await request(app)
      .get(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(customerId);
  });

  it('GET /customers/999999 returns 404 CUSTOMER_NOT_FOUND', async () => {
    const res = await request(app)
      .get('/customers/999999')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('POST /customers/:id/follow-up-notes adds a note with user_id from token', async () => {
    const res = await request(app)
      .post(`/customers/${customerId}/follow-up-notes`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ note: 'Scheduled follow-up call for next Tuesday.' });

    expect(res.status).toBe(201);
    expect(res.body.data.customer_id).toBe(customerId);
    expect(res.body.data.note).toBe('Scheduled follow-up call for next Tuesday.');
    expect(res.body.data.created_by_user_id).toBeDefined();
  });

  it('GET /customers/:id/follow-up-notes lists notes', async () => {
    const res = await request(app)
      .get(`/customers/${customerId}/follow-up-notes`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('Invalid query parameter returns 400 INVALID_QUERY_PARAMETER', async () => {
    const res = await request(app)
      .get('/customers?unknown_param=123')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QUERY_PARAMETER');
  });
});
