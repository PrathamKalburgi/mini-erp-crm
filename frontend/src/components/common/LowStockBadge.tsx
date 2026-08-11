import React from 'react';
import { Tag } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

interface LowStockBadgeProps {
  currentStock: number;
  minimumStockAlertQuantity: number;
}

export const LowStockBadge: React.FC<LowStockBadgeProps> = ({ currentStock, minimumStockAlertQuantity }) => {
  if (currentStock > minimumStockAlertQuantity) return null;
  return (
    <Tag color="warning" icon={<WarningOutlined />}>
      Low Stock
    </Tag>
  );
};
