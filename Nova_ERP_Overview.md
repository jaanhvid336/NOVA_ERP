# Nova ERP - Project Overview

## Introduction
Nova ERP (formerly Atlas ERP) is a modern, web-based Enterprise Resource Planning application designed for sales order management. It features a completely custom, premium UI with a dark-mode sidebar, glassmorphism elements, and role-based access control.

## Technology Stack
- **Frontend**: React (with React Router), Vite, Vanilla CSS, Lucide React (for icons)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (using the `pg` library)
- **Authentication**: JSON Web Tokens (JWT) & bcrypt for password hashing

## User Roles & Permissions
Nova ERP implements strict Role-Based Access Control (RBAC). 
- **Sales Representative** (`rep@nova.local`): Can submit sales orders and view customers/products.
- **Sales Manager** (`manager@nova.local`): Full access to the dashboard. Can approve submitted orders, create products, and manage customers.
- **Warehouse** (`warehouse@nova.local`): Can view inventory, allocate stock for approved orders, and ship allocated orders.
- **Finance** (`finance@nova.local`): Full access to dashboard metrics. Can view and pay invoices for shipped orders.

*(Note: The default password for all demo accounts is `password`)*

## Key Modules & Features
1. **Dashboard / Reports**: Provides high-level metrics including Invoiced Revenue, Submitted Orders count, Low-stock warnings, and a breakdown of orders by status.
2. **Sales Orders**: The core workflow engine. Orders move through states: `DRAFT -> SUBMITTED -> APPROVED -> ALLOCATED -> SHIPPED -> INVOICED`.
3. **Customers**: Manage a directory of clients with billing and shipping details.
4. **Products**: Catalog of items (e.g., Nova Task Chair, Nova Standing Desk) with SKUs and unit pricing.
5. **Inventory**: Real-time tracking of stock on hand vs. reorder levels, with "LOW STOCK" alerts.
6. **Invoices**: Automatically generated when orders are shipped. Allows Finance users to record manual payments.

## Application Architecture
- **API Routes**: Organized modularly (`/orders`, `/products`, `/customers`, `/inventory`, `/invoices`, `/reports`).
- **Database Migrations**: Custom migration runner built in Node.js (`scripts/migrate.js`) to automatically apply SQL files in sequence.
- **Design System**: A responsive UI built with pure CSS tokens (variables), featuring dynamic hover animations, customized scrollbars, and modern typography (Google Inter).

## Setup & Running
- **Database**: Created via `npm run db:create` and seeded via `npm run migrate`.
- **Development Server**: Both backend and frontend run concurrently using `npm run dev` (Frontend on port `5173`, Backend on port `4000`).
