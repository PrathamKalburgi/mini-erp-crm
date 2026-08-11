# FundsRoom Mini ERP — API Documentation

Welcome to the REST API documentation for FundsRoom Mini ERP & CRM Operations Portal.

---

## 1. General Information

- **Base URL**: `http://localhost:5000` (configurable via `PORT` env)
- **Format**: All request bodies and response payloads use JSON (`Content-Type: application/json`).
- **Naming Convention**: `snake_case` for all object keys and query parameters.
- **Timestamps**: ISO 8601 UTC strings (e.g., `2026-08-11T10:00:00.000Z`).
- **Identifiers**: Positive serial integers (`1`, `2`, `3`...).

---

## 2. Authentication & Header Specs

Protected endpoints require an `Authorization` header with a valid Bearer token:

```http
Authorization: Bearer <access_token>
```

Tokens are valid for 24 hours. The JWT payload exposes:
```json
{
  "sub": 12,
  "email": "sales@fundsroom.com",
  "role": "SALES",
  "iat": 1786442400,
  "exp": 1786528800
}
```

---

## 3. Role-Based Access Control (RBAC) Matrix

The system enforces four operational roles:

| Module / Endpoint | Allowed Roles | Read Access | Write Access |
|---|---|---|---|
| `POST /auth/login` | Public | — | Everyone |
| `GET /auth/me` | Authenticated | All Roles | — |
| `GET /customers` | Authenticated | All Roles | — |
| `POST /customers` | Restricted | — | `ADMIN`, `SALES` |
| `GET /customers/:id` | Authenticated | All Roles | — |
| `PATCH /customers/:id` | Restricted | — | `ADMIN`, `SALES` |
| `POST /customers/:id/follow-up-notes` | Restricted | — | `ADMIN`, `SALES` |
| `GET /customers/:id/follow-up-notes` | Authenticated | All Roles | — |
| `GET /products` | Authenticated | All Roles | — |
| `POST /products` | Restricted | — | `ADMIN`, `WAREHOUSE` |
| `GET /products/:id` | Authenticated | All Roles | — |
| `PATCH /products/:id` | Restricted | — | `ADMIN`, `WAREHOUSE` |
| `GET /stock-movements` | Authenticated | All Roles | — |
| `GET /challans` | Authenticated | All Roles | — |
| `POST /challans` | Restricted | — | `ADMIN`, `SALES` |
| `GET /challans/:id` | Authenticated | All Roles | — |
| `PATCH /challans/:id` | Restricted | — | `ADMIN`, `SALES` |
| `POST /challans/:id/confirm` | Restricted | — | `ADMIN`, `SALES` |
| `POST /challans/:id/cancel` | Restricted | — | `ADMIN`, `SALES` |

---

## 4. Response & Error Envelopes

### Single Resource Response (`200 OK` / `201 Created`)
```json
{
  "data": {
    "id": 1,
    "key": "value"
  }
}
```

### Paginated List Response (`200 OK`)
```json
{
  "data": [
    { "id": 1 },
    { "id": 2 }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 42,
    "total_pages": 3
  }
}
```

### Standard Error Response (`4xx` / `5xx`)
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error explanation",
    "details": [
      {
        "field": "email",
        "code": "INVALID_EMAIL",
        "message": "Invalid email address format"
      }
    ]
  }
}
```

---

## 5. Authentication API

### 5.1 Login
- **Endpoint**: `POST /auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "sales@fundsroom.com",
    "password": "Sales@123"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1...",
    "token_type": "Bearer",
    "user": {
      "id": 2,
      "email": "sales@fundsroom.com",
      "role": "SALES"
    }
  }
  ```
- **Errors**: `401 INVALID_CREDENTIALS`, `422 VALIDATION_ERROR`

### 5.2 Get Current User
- **Endpoint**: `GET /auth/me`
- **Auth**: Required (All roles)
- **Response (`200 OK`)**:
  ```json
  {
    "data": {
      "id": 2,
      "email": "sales@fundsroom.com",
      "role": "SALES"
    }
  }
  ```

### 5.3 Health Check
- **Endpoint**: `GET /health`
- **Auth**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "service": "api"
  }
  ```

---

## 6. Customer CRM API

### 6.1 List Customers
- **Endpoint**: `GET /customers`
- **Auth**: Required (All roles)
- **Query Parameters**:
  - `page` (integer, default `1`)
  - `page_size` (integer, default `20`, max `100`)
  - `search` (string: filters by name, mobile, email, business name, GST number)
  - `status` (`LEAD` | `ACTIVE` | `INACTIVE`)
  - `customer_type` (`RETAIL` | `WHOLESALE` | `DISTRIBUTOR`)
- **Response (`200 OK`)**: Paginated `Customer[]`

### 6.2 Create Customer
- **Endpoint**: `POST /customers`
- **Auth**: Required (`ADMIN`, `SALES`)
- **Request Body**:
  ```json
  {
    "customer_name": "Acme Traders",
    "mobile_number": "+919876543210",
    "email": "contact@acme.example",
    "business_name": "Acme Traders Pvt Ltd",
    "gst_number": "27AAAAA0000A1Z5",
    "customer_type": "WHOLESALE",
    "address": "123 Industrial Area, Pune, MH",
    "status": "ACTIVE",
    "follow_up_date": "2026-09-01",
    "notes": "Key wholesale account"
  }
  ```
- **Response (`201 Created`)**: Created `Customer` object

### 6.3 Get Customer Detail
- **Endpoint**: `GET /customers/:id`
- **Auth**: Required (All roles)
- **Response (`200 OK`)**: Single `Customer` object
- **Error**: `404 CUSTOMER_NOT_FOUND`

### 6.4 Update Customer
- **Endpoint**: `PATCH /customers/:id`
- **Auth**: Required (`ADMIN`, `SALES`)
- **Request Body**: Partial customer fields (at least 1 field required)
- **Response (`200 OK`)**: Updated `Customer` object

### 6.5 Add Follow-Up Note
- **Endpoint**: `POST /customers/:id/follow-up-notes`
- **Auth**: Required (`ADMIN`, `SALES`)
- **Request Body**:
  ```json
  {
    "note": "Called client regarding bulk order request."
  }
  ```
- **Response (`201 Created`)**: `CustomerFollowUpNote` (creator derived from JWT token)

### 6.6 List Follow-Up Notes
- **Endpoint**: `GET /customers/:id/follow-up-notes`
- **Auth**: Required (All roles)
- **Query Parameters**: `page`, `page_size`
- **Response (`200 OK`)**: Paginated `CustomerFollowUpNote[]`

---

## 7. Product & Inventory API

### 7.1 List Products
- **Endpoint**: `GET /products`
- **Auth**: Required (All roles)
- **Query Parameters**: `page`, `page_size`, `search`, `category`, `warehouse_location`
- **Response (`200 OK`)**: Paginated `Product[]`

### 7.2 Create Product
- **Endpoint**: `POST /products`
- **Auth**: Required (`ADMIN`, `WAREHOUSE`)
- **Request Body**:
  ```json
  {
    "product_name": "Heavy Duty Industrial Steel Pipe",
    "sku": "PROD-PIPE-001",
    "category": "Hardware",
    "unit_price": 250.00,
    "current_stock": 0,
    "minimum_stock_alert_quantity": 10,
    "warehouse_location": "Main Warehouse Block A"
  }
  ```
  *(Note: `current_stock` MUST be `0` on creation)*
- **Response (`201 Created`)**: Created `Product` object
- **Errors**: `409 SKU_ALREADY_EXISTS`, `422 VALIDATION_ERROR`

### 7.3 Get Product Detail
- **Endpoint**: `GET /products/:id`
- **Auth**: Required (All roles)
- **Response (`200 OK`)**: Single `Product` object

### 7.4 Update Product / Adjust Stock
- **Endpoint**: `PATCH /products/:id`
- **Auth**: Required (`ADMIN`, `WAREHOUSE`)
- **Request Body**:
  ```json
  {
    "current_stock": 50,
    "reason": "Stock reconciliation audit"
  }
  ```
  *(Note: `reason` is REQUIRED if `current_stock` is modified)*
- **Response (`200 OK`)**: Updated `Product` object
- **Errors**: `422 NEGATIVE_STOCK_NOT_ALLOWED`, `422 STOCK_CHANGE_REASON_REQUIRED`

### 7.5 List Stock Movements (Audit Log)
- **Endpoint**: `GET /stock-movements`
- **Auth**: Required (All roles)
- **Query Parameters**: `page`, `page_size`, `product_id`, `movement_type` (`IN` | `OUT`), `date_from`, `date_to`
- **Response (`200 OK`)**: Paginated `StockMovement[]`

---

## 8. Sales Challan API

### 8.1 List Challans
- **Endpoint**: `GET /challans`
- **Auth**: Required (All roles)
- **Query Parameters**: `page`, `page_size`, `status` (`DRAFT` | `CONFIRMED` | `CANCELLED`), `customer_id`
- **Response (`200 OK`)**: Paginated array of Challan summaries

### 8.2 Create Draft Challan
- **Endpoint**: `POST /challans`
- **Auth**: Required (`ADMIN`, `SALES`)
- **Request Body**:
  ```json
  {
    "customer_id": 1,
    "items": [
      { "product_id": 1, "quantity": 5 },
      { "product_id": 2, "quantity": 2 }
    ]
  }
  ```
- **Response (`201 Created`)**: Detail `SalesChallan` with `status: "DRAFT"`, server-generated sequence `challan_number` (e.g. `CHL-000001`), and snapshotted item details.

### 8.3 Get Challan Detail
- **Endpoint**: `GET /challans/:id`
- **Auth**: Required (All roles)
- **Response (`200 OK`)**: Detail `SalesChallan` including item snapshot lines

### 8.4 Update Draft Challan
- **Endpoint**: `PATCH /challans/:id`
- **Auth**: Required (`ADMIN`, `SALES`)
- **Request Body**: Non-empty subset of `customer_id` and `items` array
- **Response (`200 OK`)**: Updated `SalesChallan` detail
- **Errors**: `409 INVALID_CHALLAN_STATE` (if not DRAFT)

### 8.5 Confirm Challan
- **Endpoint**: `POST /challans/:id/confirm`
- **Auth**: Required (`ADMIN`, `SALES`)
- **Request Body**: `{}`
- **Behavior**: Executes in an isolated PostgreSQL transaction using `SELECT ... FOR UPDATE` row locks. Deducts product stock, logs `OUT` stock movements referencing `sales_challan_id`, and sets status to `CONFIRMED`.
- **Response (`200 OK`)**: Confirmed `SalesChallan` detail
- **Errors**:
  - `409 CHALLAN_ALREADY_CONFIRMED`
  - `409 INVALID_CHALLAN_STATE`
  - `409 INSUFFICIENT_STOCK` (includes `meta`: `product_id`, `requested_quantity`, `available_quantity`)

### 8.6 Cancel Draft Challan
- **Endpoint**: `POST /challans/:id/cancel`
- **Auth**: Required (`ADMIN`, `SALES`)
- **Request Body**: `{}`
- **Response (`200 OK`)**: Cancelled `SalesChallan` detail
- **Errors**: `409 INVALID_CHALLAN_STATE` (if already CONFIRMED or CANCELLED)

---

## 9. Error Code Reference

| Code | HTTP Status | Description |
|---|:---:|---|
| `UNAUTHENTICATED` | 401 | Missing, malformed, expired, or invalid Bearer token. |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password combination. |
| `FORBIDDEN` | 403 | User role lacks permission for endpoint. |
| `CUSTOMER_NOT_FOUND` | 404 | Customer with specified ID does not exist. |
| `PRODUCT_NOT_FOUND` | 404 | Product with specified ID does not exist. |
| `CHALLAN_NOT_FOUND` | 404 | Challan with specified ID does not exist. |
| `SKU_ALREADY_EXISTS` | 409 | Duplicate SKU provided during product creation. |
| `INVALID_CHALLAN_STATE` | 409 | Attempted write or transition on a non-DRAFT challan. |
| `CHALLAN_ALREADY_CONFIRMED` | 409 | Attempted re-confirmation of a confirmed challan. |
| `INSUFFICIENT_STOCK` | 409 | Available stock is less than requested quantity on confirmation. |
| `INVALID_QUERY_PARAMETER` | 400 | Disallowed or malformed query string parameter. |
| `VALIDATION_ERROR` | 422 | Input validation failed (Zod schema rejection). |
| `NEGATIVE_STOCK_NOT_ALLOWED` | 422 | Stock edit would result in negative current_stock. |
| `STOCK_CHANGE_REASON_REQUIRED` | 422 | Stock edit omitted mandatory explanation reason. |

---

## 10. Example cURL Workflows

### 10.1 Login & Fetch Profile
```bash
# 1. Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sales@fundsroom.com","password":"Sales@123"}'

# 2. Get Profile
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer <token>"
```

### 10.2 Product Creation & Initial Stock Setup
```bash
# 1. Create Product with stock = 0
curl -X POST http://localhost:5000/products \
  -H "Authorization: Bearer <warehouse_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Steel Rod",
    "sku": "PROD-ROD-01",
    "category": "Hardware",
    "unit_price": 120.00,
    "current_stock": 0,
    "minimum_stock_alert_quantity": 5,
    "warehouse_location": "Bay 1"
  }'

# 2. Set Initial Stock
curl -X PATCH http://localhost:5000/products/1 \
  -H "Authorization: Bearer <warehouse_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_stock": 100,
    "reason": "Initial stock setup"
  }'
```

### 10.3 Challan Draft & Confirmation
```bash
# 1. Create Draft Challan
curl -X POST http://localhost:5000/challans \
  -H "Authorization: Bearer <sales_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 1, "quantity": 10}]
  }'

# 2. Confirm Challan (Deducts 10 units from Product 1)
curl -X POST http://localhost:5000/challans/1/confirm \
  -H "Authorization: Bearer <sales_token>"
```
