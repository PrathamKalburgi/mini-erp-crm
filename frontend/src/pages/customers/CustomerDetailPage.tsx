import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Descriptions, Button, Space, Tag, Timeline, Form, Input,
  Typography, message, Spin, Alert, Row, Col,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { Customer, CustomerFollowUpNote, PaginationMeta } from '../../types';
import { CustomerStatus, CustomerType, UserRole } from '../../types';
import * as customerService from '../../services/customer.service';
import { useAuth } from '../../context/AuthContext';
import { CustomerFormDrawer } from './CustomerFormDrawer';
import axios from 'axios';
import type { ApiError } from '../../types';

const STATUS_COLORS: Record<CustomerStatus, string> = {
  [CustomerStatus.LEAD]: 'blue',
  [CustomerStatus.ACTIVE]: 'green',
  [CustomerStatus.INACTIVE]: 'default',
};

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.SALES;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState<CustomerFollowUpNote[]>([]);
  const [notesPagination, setNotesPagination] = useState<PaginationMeta>({ page: 1, page_size: 20, total_items: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addNoteForm] = Form.useForm();
  const [addingNote, setAddingNote] = useState(false);

  const customerId = Number(id);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const c = await customerService.getCustomerById(customerId);
      setCustomer(c);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        message.error('Failed to load customer');
      }
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const fetchNotes = useCallback(async (page = 1) => {
    setNotesLoading(true);
    try {
      const result = await customerService.getFollowUpNotes(customerId, { page, page_size: 20 });
      setNotes(result.data);
      setNotesPagination(result.pagination);
    } catch {
      message.error('Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  }, [customerId]);

  useEffect(() => { fetchCustomer(); fetchNotes(); }, [fetchCustomer, fetchNotes]);

  const handleAddNote = async (values: { note: string }) => {
    setAddingNote(true);
    try {
      await customerService.addFollowUpNote(customerId, values.note);
      message.success('Note added');
      addNoteForm.resetFields();
      fetchNotes(1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError;
        message.error(data?.error?.message || 'Failed to add note');
      }
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 48 }} />;
  if (notFound) return <Alert message="Customer not found" type="error" showIcon />;
  if (!customer) return null;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} style={{ marginBottom: 16 }}>
        Back to Customers
      </Button>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Row justify="space-between" align="middle">
                <Col><Typography.Title level={5} style={{ margin: 0 }}>{customer.customer_name}</Typography.Title></Col>
                {canWrite && (
                  <Col>
                    <Button size="small" onClick={() => setDrawerOpen(true)}>Edit</Button>
                  </Col>
                )}
              </Row>
            }
          >
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Business Name">{customer.business_name}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{customer.mobile_number}</Descriptions.Item>
              <Descriptions.Item label="Email">{customer.email}</Descriptions.Item>
              <Descriptions.Item label="GST Number">{customer.gst_number || '—'}</Descriptions.Item>
              <Descriptions.Item label="Type">{customer.customer_type}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[customer.status]}>{customer.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Address">{customer.address}</Descriptions.Item>
              <Descriptions.Item label="Follow-up Date">{customer.follow_up_date?.slice(0, 10)}</Descriptions.Item>
              <Descriptions.Item label="Notes">{customer.notes || '—'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Follow-up Notes" extra={<Tag>{notesPagination.total_items} notes</Tag>}>
            {canWrite && (
              <Form form={addNoteForm} onFinish={handleAddNote} style={{ marginBottom: 16 }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="note" style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: 'Note is required' }]}>
                    <Input placeholder="Add a follow-up note..." />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={addingNote} icon={<PlusOutlined />}>
                    Add
                  </Button>
                </Space.Compact>
              </Form>
            )}

            {notesLoading ? (
              <Spin />
            ) : notes.length === 0 ? (
              <Typography.Text type="secondary">No notes yet.</Typography.Text>
            ) : (
              <Timeline
                items={notes.map((n) => ({
                  children: (
                    <div>
                      <Typography.Text>{n.note}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(n.created_at).toLocaleString()}
                      </Typography.Text>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      <CustomerFormDrawer
        open={drawerOpen}
        customer={customer}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); fetchCustomer(); }}
      />
    </div>
  );
};

export default CustomerDetailPage;
