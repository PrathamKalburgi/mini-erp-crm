import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Descriptions, Button, Space, Tag, Table, Typography,
  message, Spin, Alert, Row, Col, Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { SalesChallan, SalesChallanItem } from '../../types';
import { ChallanStatus, UserRole } from '../../types';
import * as challanService from '../../services/challan.service';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import type { ApiError } from '../../types';
import type { ColumnsType } from 'antd/es/table';

const STATUS_COLORS: Record<ChallanStatus, string> = {
  [ChallanStatus.DRAFT]: 'blue',
  [ChallanStatus.CONFIRMED]: 'green',
  [ChallanStatus.CANCELLED]: 'default',
};

const ChallanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.SALES;

  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const challanId = Number(id);

  const fetchChallan = useCallback(async () => {
    setLoading(true);
    try {
      const c = await challanService.getChallanById(challanId);
      setChallan(c);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        message.error('Failed to load challan');
      }
    } finally {
      setLoading(false);
    }
  }, [challanId]);

  useEffect(() => { fetchChallan(); }, [fetchChallan]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await challanService.downloadChallanPdf(challanId);
      message.success('PDF download started');
    } catch (err) {
      message.error('Failed to download PDF invoice');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleConfirm = async () => {
    setApiError(null);
    setActionLoading(true);
    try {
      await challanService.confirmChallan(challanId);
      message.success('Challan confirmed');
      fetchChallan();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError;
        const code = data?.error?.code;
        let msg = data?.error?.message || 'Failed to confirm';
        if (code === 'INSUFFICIENT_STOCK' && data?.error?.details?.length) {
          const details = data.error.details
            .map((d) => `Product ${d.meta?.product_id}: requested ${d.meta?.requested_quantity}, available ${d.meta?.available_quantity}`)
            .join('; ');
          msg = `${msg} — ${details}`;
        }
        setApiError(msg);
      } else {
        setApiError('Network error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setApiError(null);
    setActionLoading(true);
    try {
      await challanService.cancelChallan(challanId);
      message.success('Challan cancelled');
      fetchChallan();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError;
        setApiError(data?.error?.message || 'Failed to cancel');
      } else {
        setApiError('Network error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const itemColumns: ColumnsType<SalesChallanItem> = [
    { title: 'Product', dataIndex: 'snapshot_product_name', key: 'product_name' },
    { title: 'SKU', dataIndex: 'snapshot_sku', key: 'sku' },
    { title: 'Category', dataIndex: 'snapshot_category', key: 'category' },
    { title: 'Unit Price (snapshot)', dataIndex: 'snapshot_unit_price', key: 'unit_price', render: (v: number) => `₹${Number(v).toFixed(2)}` },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 48 }} />;
  if (notFound) return <Alert message="Challan not found" type="error" showIcon />;
  if (!challan) return null;

  const isDraft = challan.status === ChallanStatus.DRAFT;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/challans')} style={{ marginBottom: 16 }}>
        Back to Challans
      </Button>

      {apiError && <Alert message={apiError} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setApiError(null)} />}

      <Card
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Typography.Title level={5} style={{ margin: 0 }}>{challan.challan_number}</Typography.Title>
                <Tag color={STATUS_COLORS[challan.status]}>{challan.status}</Tag>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<FilePdfOutlined />} loading={downloadingPdf} onClick={handleDownloadPdf}>
                  Download PDF
                </Button>
                {canWrite && isDraft && (
                  <>
                    <Button icon={<EditOutlined />} onClick={() => navigate(`/challans/${challan.id}/edit`)}>
                      Edit Draft
                    </Button>
                    <Popconfirm title="Confirm this challan? Stock will be deducted." onConfirm={handleConfirm} okText="Yes, Confirm" cancelText="No">
                      <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading}>
                        Confirm
                      </Button>
                    </Popconfirm>
                    <Popconfirm title="Cancel this challan?" onConfirm={handleCancel} okText="Yes, Cancel" cancelText="No" okButtonProps={{ danger: true }}>
                      <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>
                        Cancel
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        }
      >
        <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Challan Number">{challan.challan_number}</Descriptions.Item>
          <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[challan.status]}>{challan.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Customer ID">{challan.customer_id}</Descriptions.Item>
          <Descriptions.Item label="Total Quantity">{challan.total_quantity}</Descriptions.Item>
          <Descriptions.Item label="Created By">{challan.created_by_user_id}</Descriptions.Item>
          <Descriptions.Item label="Created At">{new Date(challan.created_at).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Updated At" span={2}>{new Date(challan.updated_at).toLocaleString()}</Descriptions.Item>
        </Descriptions>

        <Typography.Title level={5}>Line Items (Snapshot)</Typography.Title>
        <Table
          rowKey="id"
          columns={itemColumns}
          dataSource={challan.items || []}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default ChallanDetailPage;
