import React from 'react';
import { describe, it, expect } from 'vitest';
import { LowStockBadge } from '../components/common/LowStockBadge';

describe('LowStockBadge component', () => {
  it('returns null when currentStock > minimumStockAlertQuantity', () => {
    const result = LowStockBadge({ currentStock: 10, minimumStockAlertQuantity: 5 });
    expect(result).toBeNull();
  });

  it('renders warning badge when currentStock <= minimumStockAlertQuantity', () => {
    const result = LowStockBadge({ currentStock: 3, minimumStockAlertQuantity: 5 });
    expect(result).not.toBeNull();
    if (React.isValidElement(result)) {
      expect(result.props.color).toBe('warning');
    }
  });

  it('renders warning badge when currentStock equals minimumStockAlertQuantity', () => {
    const result = LowStockBadge({ currentStock: 5, minimumStockAlertQuantity: 5 });
    expect(result).not.toBeNull();
    if (React.isValidElement(result)) {
      expect(result.props.color).toBe('warning');
    }
  });
});
