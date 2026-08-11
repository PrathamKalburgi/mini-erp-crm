import React, { useEffect } from 'react';
import {
  Drawer, Form, Input, Select, DatePicker, Button, Space, message,
} from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import type { Customer, ApiError } from '../../types';
import { CustomerType, CustomerStatus } from '../../types';
import * as customerService from '../../services/customer.service';

const { Option } = Select;
const { TextArea } = Input;

interface Props {
  open: boolean;
  customer?: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerFormDrawer: React.FC<Props> = ({ open, customer, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const isEdit = !!customer;

  useEffect(() => {
    if (open) {
      if (customer) {
        form.setFieldsValue({
          ...customer,
          follow_up_date: customer.follow_up_date ? dayjs(customer.follow_up_date) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, customer, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {
      ...values,
      follow_up_date: values.follow_up_date
        ? (values.follow_up_date as ReturnType<typeof dayjs>).format('YYYY-MM-DD')
        : undefined,
    };

    try {
      if (isEdit && customer) {
        await customerService.updateCustomer(customer.id, payload);
        message.success('Customer updated successfully');
      } else {
        await customerService.createCustomer(payload);
        message.success('Customer created successfully');
      }
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError;
        if (data?.error?.details?.length) {
          data.error.details.forEach((d) => form.setFields([{ name: d.field, errors: [d.message] }]));
        } else {
          message.error(data?.error?.message || 'Operation failed');
        }
      } else {
        message.error('Network error');
      }
    }
  };

  return (
    <Drawer
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      open={open}
      onClose={onClose}
      width={480}
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={() => form.submit()}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="customer_name" label="Customer Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="mobile_number" label="Mobile Number" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="business_name" label="Business Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="gst_number" label="GST Number">
          <Input placeholder="Optional" />
        </Form.Item>
        <Form.Item name="customer_type" label="Customer Type" rules={[{ required: true }]}>
          <Select>
            {Object.values(CustomerType).map((t) => <Option key={t} value={t}>{t}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select>
            {Object.values(CustomerStatus).map((s) => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="address" label="Address" rules={[{ required: true }]}>
          <TextArea rows={2} />
        </Form.Item>
        <Form.Item name="follow_up_date" label="Follow-up Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <TextArea rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};
