// ── Enums (mirror backend exactly) ──────────────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  WAREHOUSE = 'WAREHOUSE',
  ACCOUNTS = 'ACCOUNTS',
}

export enum CustomerType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  DISTRIBUTOR = 'DISTRIBUTOR',
}

export enum CustomerStatus {
  LEAD = 'LEAD',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ChallanStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
}

// ── Entity interfaces ───────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Customer {
  id: number;
  customer_name: string;
  mobile_number: string;
  email: string;
  business_name: string;
  gst_number: string | null;
  customer_type: CustomerType;
  address: string;
  status: CustomerStatus;
  follow_up_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerFollowUpNote {
  id: number;
  customer_id: number;
  note: string;
  created_by_user_id: number;
  created_at: string;
}

export interface Product {
  id: number;
  product_name: string;
  sku: string;
  category: string;
  unit_price: number;
  current_stock: number;
  minimum_stock_alert_quantity: number;
  warehouse_location: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  quantity_changed: number;
  movement_type: StockMovementType;
  reason: string;
  created_by_user_id: number;
  sales_challan_id: number | null;
  created_at: string;
}

export interface SalesChallanItem {
  id: number;
  sales_challan_id: number;
  product_id: number;
  snapshot_product_name: string;
  snapshot_sku: string;
  snapshot_unit_price: number;
  snapshot_category: string;
  quantity: number;
}

export interface SalesChallan {
  id: number;
  challan_number: string;
  customer_id: number;
  total_quantity: number;
  status: ChallanStatus;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
  items?: SalesChallanItem[];
}

// ── API response envelopes ──────────────────────────────────────
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface SingleResponse<T> {
  data: T;
}

export interface ErrorDetail {
  field: string;
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}
