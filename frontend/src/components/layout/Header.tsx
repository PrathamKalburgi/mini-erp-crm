import React from 'react';
import { Layout, Button, Space, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../common/RoleBadge';

const { Header: AntHeader } = Layout;

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        height: 64,
      }}
    >
      <Typography.Text strong style={{ fontSize: 16 }}>
        FundsRoom Mini ERP
      </Typography.Text>
      {user && (
        <Space>
          <Typography.Text>{user.email}</Typography.Text>
          <RoleBadge role={user.role} />
          <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
            Logout
          </Button>
        </Space>
      )}
    </AntHeader>
  );
};
