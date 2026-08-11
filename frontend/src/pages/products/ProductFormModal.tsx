import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Button, message, Alert,
} from 'antd';
import axios from 'axios';
import type { Product, ApiError } from '../../types';
import * as productService from '../../services/product.service';

interface Props {
  open: boolean;
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductFormModal: React.FC<Props> = ({ open, product, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [stockReasonForm] = Form.useForm();
  const isEdit = !!product;
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // For edit: show reason field only when stock changes
  const [currentStockValue, setCurrentStockValue] = useState<number | null>(null);
  const stockChanged = isEdit && currentStockValue !== null && currentStockValue !== product?.current_stock;

  useEffect(() => {
    if (open) {
      setApiError(null);
      if (product) {
        form.setFieldsValue({
          product_name: product.product_name,
          sku: product.sku,
          category: product.category,
          unit_price: Number(product.unit_price),
          current_stock: product.current_stock,
          minimum_stock_alert_quantity: product.minimum_stock_alert_quantity,
          warehouse_location: product.warehouse_location,
        });
        setCurrentStockValue(product.current_stock);
        stockReasonForm.resetFields();
      } else {
        form.resetFields();
        stockReasonForm.resetFields();
        setCurrentStockValue(null);
      }
    }
  }, [open, product, form, stockReasonForm]);

  const handleSubmit = async () => {
    setApiError(null);
    let mainValues: Record<string, unknown>;
    try {
      mainValues = await form.validateFields();
    } catch {
      return;
    }

    // For edit: if stock changed, validate reason
    let reason: string | undefined;
    if (isEdit && stockChanged) {
      try {
        const reasonValues = await stockReasonForm.validateFields();
        reason = reasonValues.reason;
      } catch {
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEdit && product) {
        const patchPayload: Record<string, unknown> = { ...mainValues };
        if (stockChanged && reason) patchPayload.reason = reason;
        await productService.updateProduct(product.id, patchPayload);
        message.success('Product updated successfully');
        onSuccess();
      } else {
        // Create with current_stock = 0 (initial_stock is a UI-only field)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { initial_stock: initialStock, ...rest } = mainValues as Record<string, unknown> & { initial_stock?: number };
        const createPayload = { ...rest, current_stock: 0 };
        const created = await productService.createProduct(createPayload);

        // If user specified initial stock > 0, immediately PATCH with reason
        if (initialStock && initialStock > 0) {
          await productService.updateProduct(created.id, {
            current_stock: initialStock,
            reason: 'Initial stock setup',
          });
        }

        message.success('Product created successfully');
        onSuccess();
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError;
        if (data?.error?.details?.length) {
          data.error.details.forEach((d) => {
            form.setFields([{ name: d.field, errors: [d.message] }]);
          });
        }
        setApiError(data?.error?.message || 'Operation failed');
      } else {
        setApiError('Network error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Product' : 'Add Product'}
      open={open}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
          {isEdit ? 'Update' : 'Create'}
        </Button>,
      ]}
    >
      {apiError && <Alert message={apiError} type="error" showIcon style={{ marginBottom: 16 }} />}

      <Form form={form} layout="vertical" onValuesChange={(changed) => {
        if ('current_stock' in changed) setCurrentStockValue(changed.current_stock);
      }}>
        <Form.Item name="product_name" label="Product Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="unit_price" label="Unit Price (₹)" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} precision={2} />
        </Form.Item>
        {isEdit ? (
          <Form.Item name="current_stock" label="Current Stock" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
        ) : (
          <Form.Item name="initial_stock" label="Initial Stock (optional)" extra="Product is created with stock 0, then a stock adjustment is applied automatically">
            <InputNumber style={{ width: '100%' }} min={0} precision={0} defaultValue={0} />
          </Form.Item>
        )}
        <Form.Item name="minimum_stock_alert_quantity" label="Min Stock Alert Qty" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} precision={0} />
        </Form.Item>
        <Form.Item name="warehouse_location" label="Warehouse Location" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Form>

      {/* Show reason field only when editing and stock changed */}
      {isEdit && stockChanged && (
        <Form form={stockReasonForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Stock Change Reason"
            rules={[{ required: true, message: 'Reason is required when changing stock' }]}
            extra={`Current: ${product?.current_stock} → New: ${currentStockValue}`}
          >
            <Input placeholder="Explain why the stock is being changed..." />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
