import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Typography, Row, Col, message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Product, PaginationMeta } from '../../types';
import { UserRole } from '../../types';
import * as productService from '../../services/product.service';
import { useAuth } from '../../context/AuthContext';
import { LowStockBadge } from '../../components/common/LowStockBadge';
import { ProductFormModal } from './ProductFormModal';

const { Option } = Select;

const ProductListPage: React.FC = () => {
  const { user } = useAuth();
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.WAREHOUSE;

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, page_size: 20, total_items: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [locationFilter, setLocationFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();

  const fetchProducts = useCallback(async (page = 1, page_size = 20) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { page, page_size };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter) params.category = categoryFilter;
      if (locationFilter) params.warehouse_location = locationFilter;
      const result = await productService.getProducts(params);
      setProducts(result.data);
      setPagination(result.pagination);
    } catch {
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, locationFilter]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const columns: ColumnsType<Product> = [
    { title: 'Product Name', dataIndex: 'product_name', key: 'product_name' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => `₹${Number(v).toFixed(2)}` },
    {
      title: 'Stock', key: 'stock',
      render: (_, r: Product) => (
        <Space>
          <span>{r.current_stock}</span>
          <LowStockBadge currentStock={r.current_stock} minimumStockAlertQuantity={r.minimum_stock_alert_quantity} />
        </Space>
      ),
    },
    { title: 'Min Alert Qty', dataIndex: 'minimum_stock_alert_quantity', key: 'minimum_stock_alert_quantity' },
    { title: 'Location', dataIndex: 'warehouse_location', key: 'warehouse_location' },
    ...(canWrite ? [{
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: Product) => (
        <Button size="small" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditProduct(record); setModalOpen(true); }}>
          Edit
        </Button>
      ),
    }] : []),
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Typography.Title level={4} style={{ margin: 0 }}>Products</Typography.Title></Col>
        {canWrite && (
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditProduct(undefined); setModalOpen(true); }}>
              Add Product
            </Button>
          </Col>
        )}
      </Row>

      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchProducts(1)}
            allowClear
          />
        </Col>
        <Col>
          <Input
            placeholder="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value || undefined)}
            allowClear
            style={{ width: 160 }}
          />
        </Col>
        <Col>
          <Input
            placeholder="Filter by location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value || undefined)}
            allowClear
            style={{ width: 160 }}
          />
        </Col>
        <Col><Button onClick={() => fetchProducts(1)}>Search</Button></Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.page_size,
          total: pagination.total_items,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, page_size) => fetchProducts(page, page_size),
        }}
      />

      <ProductFormModal
        open={modalOpen}
        product={editProduct}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); fetchProducts(1); }}
      />
    </div>
  );
};

export default ProductListPage;
