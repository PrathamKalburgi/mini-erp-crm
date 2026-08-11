import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Select, DatePicker, Typography, message, Row, Col, Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { StockMovement, PaginationMeta } from '../../types';
import { StockMovementType } from '../../types';
import * as productService from '../../services/product.service';
import dayjs from 'dayjs';
import { Tag } from 'antd';

const { Option } = Select;
const { RangePicker } = DatePicker;

const StockMovementLogPage: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, page_size: 20, total_items: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [productIdFilter, setProductIdFilter] = useState<number | undefined>();
  const [movementTypeFilter, setMovementTypeFilter] = useState<StockMovementType | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const fetchMovements = useCallback(async (page = 1, page_size = 20) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { page, page_size };
      if (productIdFilter !== undefined) params.product_id = productIdFilter;
      if (movementTypeFilter) params.movement_type = movementTypeFilter;
      if (dateRange) {
        params.date_from = dateRange[0];
        params.date_to = dateRange[1];
      }
      const result = await productService.getStockMovements(params);
      setMovements(result.data);
      setPagination(result.pagination);
    } catch {
      message.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [productIdFilter, movementTypeFilter, dateRange]);

  useEffect(() => { fetchMovements(1); }, [fetchMovements]);

  const columns: ColumnsType<StockMovement> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Product ID', dataIndex: 'product_id', key: 'product_id', width: 100 },
    { title: 'Type', dataIndex: 'movement_type', key: 'movement_type', width: 80, render: (v: StockMovementType) => <Tag color={v === StockMovementType.IN ? 'green' : 'red'}>{v}</Tag> },
    { title: 'Qty Changed', dataIndex: 'quantity_changed', key: 'quantity_changed', width: 100 },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: 'Challan ID', dataIndex: 'sales_challan_id', key: 'sales_challan_id', width: 100, render: (v) => v || '—' },
    { title: 'Created By', dataIndex: 'created_by_user_id', key: 'created_by_user_id', width: 100 },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', width: 170, render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Typography.Title level={4} style={{ margin: 0 }}>Stock Movement Log</Typography.Title></Col>
      </Row>

      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col>
          <Typography.Text style={{ marginRight: 4 }}>Product ID:</Typography.Text>
          <input
            type="number"
            min={1}
            placeholder="e.g. 1"
            style={{ width: 80, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}
            onChange={(e) => setProductIdFilter(e.target.value ? Number(e.target.value) : undefined)}
          />
        </Col>
        <Col>
          <Select
            placeholder="Movement Type"
            allowClear
            style={{ width: 150 }}
            value={movementTypeFilter}
            onChange={(v) => setMovementTypeFilter(v)}
          >
            <Option value={StockMovementType.IN}>IN</Option>
            <Option value={StockMovementType.OUT}>OUT</Option>
          </Select>
        </Col>
        <Col>
          <Space>
            <Typography.Text>Date Range:</Typography.Text>
            <RangePicker
              format="YYYY-MM-DD"
              onChange={(_, dateStrings) => {
                if (dateStrings[0] && dateStrings[1]) {
                  setDateRange([dateStrings[0], dateStrings[1]]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={movements}
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.page_size,
          total: pagination.total_items,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, page_size) => fetchMovements(page, page_size),
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
};

export default StockMovementLogPage;
