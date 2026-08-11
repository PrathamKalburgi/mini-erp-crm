import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Tag, Typography, Row, Col, message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Customer, PaginationMeta } from '../../types';
import { CustomerStatus, CustomerType, UserRole } from '../../types';
import * as customerService from '../../services/customer.service';
import { useAuth } from '../../context/AuthContext';
import { CustomerFormDrawer } from './CustomerFormDrawer';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const STATUS_COLORS: Record<CustomerStatus, string> = {
  [CustomerStatus.LEAD]: 'blue',
  [CustomerStatus.ACTIVE]: 'green',
  [CustomerStatus.INACTIVE]: 'default',
};

const CustomerListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.SALES;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, page_size: 20, total_items: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<CustomerType | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();

  const fetchCustomers = useCallback(async (page = 1, page_size = 20) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { page, page_size };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.customer_type = typeFilter;
      const result = await customerService.getCustomers(params);
      setCustomers(result.data);
      setPagination(result.pagination);
    } catch {
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { fetchCustomers(1); }, [fetchCustomers]);

  const columns: ColumnsType<Customer> = [
    { title: 'Name', dataIndex: 'customer_name', key: 'customer_name', render: (v, r) => <a onClick={() => navigate(`/customers/${r.id}`)}>{v}</a> },
    { title: 'Business', dataIndex: 'business_name', key: 'business_name' },
    { title: 'Mobile', dataIndex: 'mobile_number', key: 'mobile_number' },
    { title: 'Type', dataIndex: 'customer_type', key: 'customer_type' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: CustomerStatus) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    { title: 'Follow-up Date', dataIndex: 'follow_up_date', key: 'follow_up_date', render: (v: string) => v?.slice(0, 10) },
    ...(canWrite ? [{
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Customer) => (
        <Button size="small" onClick={(e) => { e.stopPropagation(); setEditCustomer(record); setDrawerOpen(true); }}>
          Edit
        </Button>
      ),
    }] : []),
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Typography.Title level={4} style={{ margin: 0 }}>Customers</Typography.Title></Col>
        {canWrite && (
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditCustomer(undefined); setDrawerOpen(true); }}>
              Add Customer
            </Button>
          </Col>
        )}
      </Row>

      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name, mobile, email, business, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchCustomers(1)}
            allowClear
          />
        </Col>
        <Col>
          <Select placeholder="Status" allowClear style={{ width: 120 }} value={statusFilter} onChange={(v) => setStatusFilter(v)}>
            {Object.values(CustomerStatus).map((s) => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>
        <Col>
          <Select placeholder="Type" allowClear style={{ width: 130 }} value={typeFilter} onChange={(v) => setTypeFilter(v)}>
            {Object.values(CustomerType).map((t) => <Option key={t} value={t}>{t}</Option>)}
          </Select>
        </Col>
        <Col>
          <Button onClick={() => fetchCustomers(1)}>Search</Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={customers}
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.page_size,
          total: pagination.total_items,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, page_size) => fetchCustomers(page, page_size),
        }}
        onRow={(record) => ({ onClick: () => navigate(`/customers/${record.id}`) })}
        style={{ cursor: 'pointer' }}
      />

      <CustomerFormDrawer
        open={drawerOpen}
        customer={editCustomer}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); fetchCustomers(1); }}
      />
    </div>
  );
};

export default CustomerListPage;
