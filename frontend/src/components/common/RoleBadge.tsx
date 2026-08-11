import React from 'react';
import { Tag } from 'antd';
import { UserRole } from '../../types';

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'red',
  [UserRole.SALES]: 'blue',
  [UserRole.WAREHOUSE]: 'orange',
  [UserRole.ACCOUNTS]: 'green',
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <Tag color={ROLE_COLORS[role]}>{role}</Tag>
);
