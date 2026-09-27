INSERT INTO users (full_name, email, password_hash, role) VALUES
  ('Ethan Wright', 'rep@nova.local', '$2a$10$bhPmxhIe2hyKEoSPm5mht.mb09efh.mttBLEOzCJvf/ONqT3FrnF2', 'SALES_REP'),
  ('Olivia Bennett', 'manager@nova.local', '$2a$10$bhPmxhIe2hyKEoSPm5mht.mb09efh.mttBLEOzCJvf/ONqT3FrnF2', 'SALES_MANAGER'),
  ('Marcus Cole', 'warehouse@nova.local', '$2a$10$bhPmxhIe2hyKEoSPm5mht.mb09efh.mttBLEOzCJvf/ONqT3FrnF2', 'WAREHOUSE'),
  ('Elena Rostova', 'finance@nova.local', '$2a$10$bhPmxhIe2hyKEoSPm5mht.mb09efh.mttBLEOzCJvf/ONqT3FrnF2', 'FINANCE');

INSERT INTO customers (code, name, email, phone, billing_address, shipping_address) VALUES
  ('CUS-1001', 'Northstar Retail', 'orders@northstar.example', '+1 555 0101', '80 Market Street, Boston', '80 Market Street, Boston'),
  ('CUS-1002', 'Cedar & Co.', 'purchasing@cedar.example', '+1 555 0102', '12 River Road, Austin', '12 River Road, Austin'),
  ('CUS-1003', 'Bluebird Studio', 'team@bluebird.example', '+1 555 0103', '40 King Lane, Seattle', '40 King Lane, Seattle');

INSERT INTO products (sku, name, description, unit_price) VALUES
  ('AT-CHAIR-01', 'Nova Task Chair', 'Adjustable mesh office chair', 249.00),
  ('AT-DESK-01', 'Nova Standing Desk', 'Electric sit-stand desk', 699.00),
  ('AT-LAMP-01', 'Focus Desk Lamp', 'Dimmable LED desk lamp', 89.00),
  ('AT-DOCK-01', 'USB-C Dock', 'Dual display USB-C docking station', 179.00);

INSERT INTO inventory (product_id, quantity_on_hand, reorder_level)
SELECT id,
  CASE sku WHEN 'AT-CHAIR-01' THEN 28 WHEN 'AT-DESK-01' THEN 12 WHEN 'AT-LAMP-01' THEN 44 ELSE 18 END,
  CASE sku WHEN 'AT-CHAIR-01' THEN 8 WHEN 'AT-DESK-01' THEN 5 WHEN 'AT-LAMP-01' THEN 10 ELSE 6 END
FROM products;
