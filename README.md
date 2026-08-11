# FundsRoom Mini ERP + CRM Operations Portal

A full-stack, enterprise-grade Mini ERP and CRM system built for manufacturing and distribution operations. Features role-based access control (RBAC), customer lead tracking & follow-up notes, real-time inventory management with strict audit trails, dynamic Sales Challan drafting, and atomic multi-item stock deduction workflows with complete transaction rollback safety.

---

## 🌟 Key Features

- **Authentication & RBAC Security**: JWT-authenticated sessions with 4 granular roles: `ADMIN`, `SALES`, `WAREHOUSE`, and `ACCOUNTS`.
- **CRM & Follow-Up Tracking**: Comprehensive customer lifecycle management (`LEAD`, `ACTIVE`, `INACTIVE`) with timeline notes.
- **Product Catalog & Inventory Audit**: Automatic stock movement tracking (`IN` / `OUT`), enforced mandatory reasons for manual stock adjustments, and low-stock alerts.
- **Sales Challans Workflow**: Multi-item sales challans with automatic snapshotting of line item prices/skus, status transitions (`DRAFT` → `CONFIRMED` / `CANCELLED`), and atomic stock deductions.
- **Transactional Rollback Safety**: Prevents negative inventory and partial stock updates; single insufficient stock item rolls back the entire confirmation transaction.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Ant Design v5, React Router v6, Axios |
| **Backend** | Node.js (v20), Express.js, TypeScript, Prisma ORM, Zod, Bcrypt, JWT |
| **Production Database** | Supabase PostgreSQL |
| **Local DB Container** | PostgreSQL 16 Alpine (via Docker Compose) |
| **Containerization** | Docker, Docker Compose |
| **Hosting & Deployment** | Vercel (Frontend SPA) + Render (Backend Web Service) |

---

## 🏗️ Architecture & Database Schema

The database model consists of 7 canonical entities managed via Prisma ORM:

```mermaid
erDiagram
    USER ||--o{ CUSTOMER_FOLLOW_UP_NOTE : writes
    USER ||--o{ SALES_CHALLAN : creates
    CUSTOMER ||--o{ CUSTOMER_FOLLOW_UP_NOTE : has
    CUSTOMER ||--o{ SALES_CHALLAN : receives
    PRODUCT ||--o{ STOCK_MOVEMENT : tracks
    PRODUCT ||--o{ SALES_CHALLAN_ITEM : contains
    SALES_CHALLAN ||--|{ SALES_CHALLAN_ITEM : includes
    SALES_CHALLAN ||--o{ STOCK_MOVEMENT : triggers
```

### Entities:
1. `User`: User accounts with role assignments (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
2. `Customer`: Client profiles, business metadata, and lifecycle status.
3. `CustomerFollowUpNote`: Follow-up history and CRM notes linked to customer profiles.
4. `Product`: Catalog items, pricing, current stock, alert thresholds, and warehouse locations.
5. `StockMovement`: Immutable audit log tracking every inventory increase (`IN`) or decrease (`OUT`).
6. `SalesChallan`: Sales delivery notes (`CHL-XXXXXX`) with total quantities and status lifecycle (`DRAFT`, `CONFIRMED`, `CANCELLED`).
7. `SalesChallanItem`: Immutable line item snapshots inside a sales challan.

---

## 🔐 Mandatory Test Accounts

The database seed script automatically populates test credentials for all 4 user roles:

| Email | Password | Role | Access Scope |
|---|---|---|---|
| `admin@fundsroom.com` | `Admin@123` | `ADMIN` | Full System Access (Read/Write all modules) |
| `sales@fundsroom.com` | `Sales@123` | `SALES` | Full CRM, View Catalog, Create/Confirm Challans |
| `warehouse@fundsroom.com` | `Warehouse@123` | `WAREHOUSE` | Manage Products & Stock Movements, Read Challans |
| `accounts@fundsroom.com` | `Accounts@123` | `ACCOUNTS` | Read-Only Access across all business entities |

*Note*: Test passwords are automatically hashed with `bcrypt` (salt factor 10) during seeding.

---

## 🚀 Quick Start Guide

### Option A: Local Evaluation via Docker Compose (Self-Contained)

Ensure Docker Desktop is running, then execute from the project root:

```bash
# Build and start PostgreSQL 16, Backend API, and Frontend SPA
docker-compose up --build
```

- **Frontend Application**: `http://localhost:8080`
- **Backend API**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/health`

---

### Option B: Manual Local Development Setup

#### 1. Prerequisites
- Node.js (v18 or v20 LTS)
- PostgreSQL database instance running locally or on cloud (e.g. Supabase)

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Update DATABASE_URL and JWT_SECRET in .env

# Run Prisma database migrations
npx prisma migrate dev

# Seed mandatory test accounts and demo data
npx prisma db seed

# Start backend dev server (runs on port 5000)
npm run dev
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start Vite dev server (runs on port 5173)
npm run dev
```

---

## ⚙️ Environment Variables Reference

### Root / Backend `.env`
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/fundsroom_crm?sslmode=disable"
JWT_SECRET="super-secret-production-key-min-32-chars-length"
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 📡 REST API Reference

All REST endpoints adhere strictly to the canonical response envelopes:
- **Standard**: `{ "data": ... }`
- **Paginated**: `{ "data": [...], "pagination": { "page", "page_size", "total_items", "total_pages" } }`
- **Error**: `{ "error": { "code", "message", "details": [...] } }`

| Method | Endpoint | Access Roles | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticate user & receive JWT token |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile |
| `GET` | `/health` | Public | Server & infrastructure health check |
| `GET` | `/customers` | All Roles | Search & paginate customers |
| `POST` | `/customers` | Admin, Sales, Warehouse | Create customer profile |
| `GET` | `/customers/:id` | All Roles | Get customer details by ID |
| `PATCH` | `/customers/:id` | Admin, Sales, Warehouse | Update customer profile |
| `POST` | `/customers/:id/follow-up-notes` | Admin, Sales, Warehouse | Add follow-up note to customer timeline |
| `GET` | `/customers/:id/follow-up-notes` | All Roles | Get customer follow-up history |
| `GET` | `/products` | All Roles | Search & paginate product catalog |
| `POST` | `/products` | Admin, Warehouse | Create product entry |
| `GET` | `/products/:id` | All Roles | Get product details by ID |
| `PATCH` | `/products/:id` | Admin, Warehouse | Manual stock/price update with mandatory reason |
| `GET` | `/stock-movements` | All Roles | Audit log of stock movements (`IN`/`OUT`) |
| `GET` | `/challans` | All Roles | List sales challans |
| `POST` | `/challans` | Admin, Sales | Create draft sales challan |
| `GET` | `/challans/:id` | All Roles | Get sales challan details & line items |
| `PATCH` | `/challans/:id` | Admin, Sales | Edit draft sales challan |
| `POST` | `/challans/:id/confirm` | Admin, Sales | Confirm challan & deduct stock atomically |
| `POST` | `/challans/:id/cancel` | Admin, Sales | Cancel draft sales challan |

Full OpenAPI specification is available at [`docs/openapi.json`](./docs/openapi.json) and detailed markdown documentation at [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md).

---

## ☁️ Production Deployment Architecture

```mermaid
flowchart LR
    Browser["Browser / SPA"] -->|HTTPS REST| Vercel["Vercel (React Frontend)"]
    Vercel -->|HTTPS API Requests| Render["Render (Express Backend)"]
    Render -->|PostgreSQL Wire Protocol + SSL| Supabase["Supabase (PostgreSQL Production Database)"]
```

### Production Setup Steps:

1. **Database (Supabase PostgreSQL)**:
   - Create project on Supabase.
   - Obtain connection string: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`.

2. **Backend API (Render Web Service)**:
   - Connect repository branch to Render Web Service.
   - **Environment Variables**: Set `DATABASE_URL` (Supabase connection string), `JWT_SECRET`, `CORS_ORIGIN` (Vercel URL), `NODE_ENV=production`.
   - **Build Command**: `cd backend && npm ci && npx prisma generate && npm run build`
   - **Start Command**: `cd backend && npx prisma migrate deploy && npx prisma db seed && node dist/main.js`

3. **Frontend SPA (Vercel)**:
   - Connect repository root to Vercel project.
   - **Root Directory**: `frontend`
   - **Environment Variable**: Set `VITE_API_BASE_URL` to Render backend URL (e.g. `https://your-backend.onrender.com`).
   - SPA route rewrites configured via `frontend/vercel.json`.

---

## ⚡ Operational Note: Render Free-Tier Cold Starts

When hosted on Render's free tier, backend instances spin down after 15 minutes of inactivity:
- The **first request** after an idle period may take **50–70 seconds** while Render spins up the Node.js container.
- Subsequent requests respond instantly (<100ms).
- The frontend client Axios instance is configured with a 90-second timeout to handle cold-start container wake-ups seamlessly without user-facing connection timeout errors.

---

## 🧪 Testing & Verification

Both backend and frontend feature automated test suites powered by Vitest:

### Run Backend Integration Tests
```bash
cd backend
npm run test
```
*Executes all 5 backend test suites (26 tests total covering Auth, RBAC, CRM, Inventory Adjustments, Challan Confirmation, and Transaction Rollbacks).*

### Run Frontend Component Tests
```bash
cd frontend
npm run test
```
*Executes frontend component and route guard unit tests.*

---

## 📄 License & Attribution

Developed for FundsRoom Mini ERP & CRM Operations Portal assignment. All rights reserved.
