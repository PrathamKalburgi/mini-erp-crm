import React from 'react';
import { Layout, Menu } from 'antd';
import {
  TeamOutlined,
  ShoppingOutlined,
  SwapOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const menuItems = [
  { key: '/customers', icon: <TeamOutlined />, label: 'Customers' },
  { key: '/products', icon: <ShoppingOutlined />, label: 'Products' },
  { key: '/stock-movements', icon: <SwapOutlined />, label: 'Stock Movements' },
  { key: '/challans', icon: <FileTextOutlined />, label: 'Challans' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key || '';

  return (
    <Sider
      width={220}
      style={{ background: '#001529', minHeight: '100vh' }}
      breakpoint="lg"
      collapsedWidth={64}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: 1,
        }}
      >
        CRM
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
};
