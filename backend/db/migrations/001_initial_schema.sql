CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(120) NOT NULL,
  email varchar(180) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  role varchar(30) NOT NULL CHECK (role IN ('SALES_REP', 'SALES_MANAGER', 'WAREHOUSE', 'FINANCE')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  email varchar(180),
  phone varchar(40),
  billing_address text,
  shipping_address text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(60) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  description text,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand integer NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_level integer NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(40) NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  sales_rep_id uuid NOT NULL REFERENCES users(id),
  status varchar(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ALLOCATED', 'SHIPPED', 'INVOICED', 'CANCELLED', 'REJECTED')),
  notes text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number varchar(40) NOT NULL UNIQUE,
  sales_order_id uuid NOT NULL UNIQUE REFERENCES sales_orders(id),
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'VOID')),
  due_date date,
  total_amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description varchar(240) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,
  line_total numeric(12,2) NOT NULL
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method varchar(40) NOT NULL,
  reference varchar(100),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_orders_status_idx ON sales_orders(status);
CREATE INDEX sales_orders_customer_idx ON sales_orders(customer_id);
CREATE INDEX payments_invoice_idx ON payments(invoice_id);
