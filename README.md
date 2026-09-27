# Atlas ERP Sales Order Management

React, Node.js, Express, and PostgreSQL implementation of the sales order workflow described in `CLAUDE.pdf`.

## Stack

- React + Vite frontend
- Node.js + Express REST API
- PostgreSQL with versioned SQL migrations
- JWT authentication and role-based access control

## Prerequisites

- Node.js 20 or later
- PostgreSQL 14 or later

## Setup

1. Create the database:

   ```sql
   CREATE DATABASE atlas_erp_db;
   ```

2. The API local configuration is at `backend/.env`. It is already set to connect as `postgres` on `localhost:5432` with the supplied password. Change the connection string if your PostgreSQL user, host, or database name differs. You can create the configured database safely with `npm --prefix backend run db:create`.

3. Install packages from the repository root:

   ```bash
   npm run install:all
   ```

4. Create schema and sample data:

   ```bash
   npm --prefix backend run migrate
   ```

5. Start both applications:

   ```bash
   npm run dev
   ```

   Web: `http://localhost:5173`

   API: `http://localhost:4000/api/health`

## Demo accounts

All demo accounts use password `password`.

| Role | Email |
| --- | --- |
| Sales representative | `rep@atlas.local` |
| Sales manager | `manager@atlas.local` |
| Warehouse | `warehouse@atlas.local` |
| Finance | `finance@atlas.local` |

## Workflow

`DRAFT -> SUBMITTED -> APPROVED -> ALLOCATED -> SHIPPED -> INVOICED`

- Sales representatives create and submit their orders.
- Sales managers approve or reject submitted orders.
- Warehouse staff allocate stock and mark allocated orders as shipped.
- Finance creates invoices and records payments.
- An allocated order can be cancelled before shipment and its stock is returned.

## API overview

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST|PATCH /api/products`, `GET|POST|PATCH /api/customers`
- `GET|POST /api/orders`, `GET /api/orders/:id`
- `POST /api/orders/:id/{submit,decision,allocate,ship,cancel,invoice}`
- `GET|PATCH /api/inventory/:productId`
- `GET /api/invoices`, `POST /api/invoices/:id/payments`
- `GET /api/reports/dashboard`

## Verification

```bash
npm --prefix backend test
npm --prefix frontend run build
```

The API integration path requires a running PostgreSQL server with the `atlas_erp_db` database created before migrations and local end-to-end testing can run.
