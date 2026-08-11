import React, { useEffect, useState, useCallback } from 'react';
import {
  Form, Select, Button, InputNumber, Typography, message, Alert,
  Card, Space, Divider, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import type { Customer, Product, SalesChallan, ApiError, ErrorDetail } from '../../types';
import * as customerService from '../../services/customer.service';
import * as productService from '../../services/product.service';
import * as challanService from '../../services/challan.service';

const { Option } = Select;

interface LineItem {
  product_id: number | null;
  quantity: number;
}

const ChallanFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id && id !== 'new';
  const challanId = isEdit ? Number(id) : null;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [items, setItems] = useState<LineItem[]>([{ product_id: null, quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [stockErrors, setStockErrors] = useState<ErrorDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // Load dropdowns
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          customerService.getCustomers({ page: 1, page_size: 100 }),
          productService.getProducts({ page: 1, page_size: 100 }),
        ]);
        setCustomers(cRes.data);
        setProducts(pRes.data);
      } catch {
        message.error('Failed to load customers/products');
      }
    };
    loadDropdowns();
  }, []);

  // Load existing challan for edit
  useEffect(() => {
    if (!isEdit || !challanId) return;
    setLoading(true);
    challanService.getChallanById(challanId)
      .then((c: SalesChallan) => {
        setSelectedCustomerId(c.customer_id);
        setItems((c.items || []).map((item) => ({ product_id: item.product_id, quantity: item.quantity })));
      })
      .catch(() => message.error('Failed to load challan'))
      .finally(() => setLoading(false));
  }, [isEdit, challanId]);

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const addLine = () => setItems([...items, { product_id: null, quantity: 1 }]);
  const removeLine = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof LineItem, value: number | null) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const validate = (): boolean => {
    if (!selectedCustomerId) { message.error('Please select a customer'); return false; }
    if (items.length === 0) { message.error('At least one item is required'); return false; }
    for (const item of items) {
      if (!item.product_id) { message.error('All items must have a product selected'); return false; }
      if (!item.quantity || item.quantity < 1) { message.error('All quantities must be at least 1'); return false; }
    }
    const ids = items.map((i) => i.product_id);
    if (new Set(ids).size !== ids.length) { message.error('Duplicate products are not allowed'); return false; }
    return true;
  };

  const handleSubmit = async (confirmImmediately: boolean) => {
    if (!validate()) return;
    setApiError(null);
    setStockErrors([]);
    setSubmitting(true);

    const payload = {
      customer_id: selectedCustomerId!,
      items: items.map((item) => ({ product_id: item.product_id!, quantity: item.quantity })),
    };

    try {
      let challan: SalesChallan;
      if (isEdit && challanId) {
        challan = await challanService.updateChallan(challanId, payload);
      } else {
        challan = await challanService.createChallan(payload);
      }

      if (confirmImmediately) {
        await challanService.confirmChallan(challan.id);
        message.success(`Challan ${challan.challan_number} confirmed`);
      } else {
        message.success(`Challan ${challan.challan_number} saved as Draft`);
      }
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError;
        const code = data?.error?.code;
        if (code === 'INSUFFICIENT_STOCK' && data?.error?.details?.length) {
          setStockErrors(data.error.details);
        }
        setApiError(data?.error?.message || 'Operation failed');
      } else {
        setApiError('Network error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/challans')} style={{ marginBottom: 16 }}>
        Back to Challans
      </Button>

      <Typography.Title level={4}>{isEdit ? 'Edit Challan' : 'Create Challan'}</Typography.Title>

      {apiError && (
        <Alert message={apiError} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {stockErrors.length > 0 && (
        <Alert
          type="error"
          message="Insufficient Stock"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {stockErrors.map((e, i) => (
                <li key={i}>
                  Product ID {(e.meta?.product_id as number)}: requested {(e.meta?.requested_quantity as number)}, available {(e.meta?.available_quantity as number)}
                </li>
              ))}
            </ul>
          }
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Form layout="vertical">
          <Form.Item label="Customer" required>
            <Select
              showSearch
              placeholder="Select customer"
              value={selectedCustomerId}
              onChange={(v) => setSelectedCustomerId(v)}
              filterOption={(input, option) =>
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            >
              {customers.map((c) => (
                <Option key={c.id} value={c.id}>{c.customer_name} ({c.business_name})</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>

        <Divider>Line Items</Divider>

        {items.map((item, idx) => (
          <Row key={idx} gutter={8} align="middle" style={{ marginBottom: 8 }}>
            <Col flex="auto">
              <Select
                showSearch
                placeholder="Select product"
                value={item.product_id}
                onChange={(v) => updateLine(idx, 'product_id', v)}
                filterOption={(input, option) =>
                  String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: '100%' }}
              >
                {products.map((p) => (
                  <Option key={p.id} value={p.id}>{p.product_name} — SKU: {p.sku} (Stock: {p.current_stock})</Option>
                ))}
              </Select>
            </Col>
            <Col style={{ width: 110 }}>
              <InputNumber
                min={1}
                value={item.quantity}
                onChange={(v) => updateLine(idx, 'quantity', v)}
                placeholder="Qty"
                style={{ width: '100%' }}
              />
            </Col>
            <Col>
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={() => removeLine(idx)}
                disabled={items.length === 1}
              />
            </Col>
          </Row>
        ))}

        <Button icon={<PlusOutlined />} onClick={addLine} style={{ marginBottom: 16 }}>
          Add Item
        </Button>

        <Divider />

        <Row justify="space-between" align="middle">
          <Col>
            <Typography.Text strong>Total Quantity Preview: {totalQuantity}</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              (Server calculates the authoritative total on save)
            </Typography.Text>
          </Col>
          <Col>
            <Space>
              <Button onClick={() => navigate('/challans')}>Cancel</Button>
              <Button onClick={() => handleSubmit(false)} loading={submitting}>
                Save Draft
              </Button>
              <Button type="primary" onClick={() => handleSubmit(true)} loading={submitting}>
                Save &amp; Confirm
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ChallanFormPage;
