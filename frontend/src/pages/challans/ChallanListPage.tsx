import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Select, Tag, Typography, Row, Col, message, Space,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { SalesChallan, PaginationMeta } from '../../types';
import { ChallanStatus, UserRole } from '../../types';
import * as challanService from '../../services/challan.service';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const STATUS_COLORS: Record<ChallanStatus, string> = {
  [ChallanStatus.DRAFT]: 'blue',
  [ChallanStatus.CONFIRMED]: 'green',
  [ChallanStatus.CANCELLED]: 'default',
};

const ChallanListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.SALES;

  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, page_size: 20, total_items: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ChallanStatus | undefined>();
  const [customerIdFilter, setCustomerIdFilter] = useState<number | undefined>();

  const fetchChallans = useCallback(async (page = 1, page_size = 20) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { page, page_size };
      if (statusFilter) params.status = statusFilter;
      if (customerIdFilter !== undefined) params.customer_id = customerIdFilter;
      const result = await challanService.getChallans(params);
      setChallans(result.data);
      setPagination(result.pagination);
    } catch {
      message.error('Failed to load challans');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, customerIdFilter]);

  useEffect(() => { fetchChallans(1); }, [fetchChallans]);

  const columns: ColumnsType<SalesChallan> = [
    { title: 'Challan No.', dataIndex: 'challan_number', key: 'challan_number', render: (v, r) => <a onClick={() => navigate(`/challans/${r.id}`)}>{v}</a> },
    { title: 'Customer ID', dataIndex: 'customer_id', key: 'customer_id' },
    { title: 'Total Qty', dataIndex: 'total_quantity', key: 'total_quantity' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: ChallanStatus) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    { title: 'Created By', dataIndex: 'created_by_user_id', key: 'created_by_user_id' },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    ...(canWrite ? [{
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: SalesChallan) => (
        <Button size="small" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/challans/${record.id}`); }}>
          View
        </Button>
      ),
    }] : []),
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Typography.Title level={4} style={{ margin: 0 }}>Sales Challans</Typography.Title></Col>
        {canWrite && (
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/challans/new')}>
              Create Challan
            </Button>
          </Col>
        )}
      </Row>

      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col>
          <Select placeholder="Filter by status" allowClear style={{ width: 160 }} value={statusFilter} onChange={(v) => setStatusFilter(v)}>
            {Object.values(ChallanStatus).map((s) => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Col>
        <Col>
          <Space>
            <Typography.Text>Customer ID:</Typography.Text>
            <input
              type="number"
              min={1}
              placeholder="e.g. 1"
              style={{ width: 80, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}
              onChange={(e) => setCustomerIdFilter(e.target.value ? Number(e.target.value) : undefined)}
            />
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={challans}
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.page_size,
          total: pagination.total_items,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, page_size) => fetchChallans(page, page_size),
        }}
        onRow={(record) => ({ onClick: () => navigate(`/challans/${record.id}`) })}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
};

export default ChallanListPage;
