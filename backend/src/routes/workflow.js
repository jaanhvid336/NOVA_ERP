import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, badRequest } from '../utils/http.js';

export const workflowRouter = Router();
workflowRouter.use(authenticate);

async function transition(client, orderId, expected, next) {
  const result = await client.query('UPDATE sales_orders SET status = $1, updated_at = now() WHERE id = $2 AND status = $3 RETURNING id, order_number AS "orderNumber", status', [next, orderId, expected]);
  if (!result.rows[0]) throw badRequest(`Order must be ${expected} before it can become ${next}`);
  return result.rows[0];
}

workflowRouter.post('/orders/:id/submit', authorize('SALES_REP', 'SALES_MANAGER'), asyncHandler(async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = request.user.role === 'SALES_REP' ? await client.query('SELECT id FROM sales_orders WHERE id = $1 AND sales_rep_id = $2', [request.params.id, request.user.sub]) : { rows: [{ id: request.params.id }] };
    if (!owned.rows[0]) throw badRequest('You can only submit your own orders');
    const order = await transition(client, request.params.id, 'DRAFT', 'SUBMITTED');
    await client.query('COMMIT');
    response.json(order);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

workflowRouter.post('/orders/:id/decision', authorize('SALES_MANAGER'), asyncHandler(async (request, response) => {
  const schema = z.object({ approved: z.boolean() });
  const { approved } = schema.parse(request.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await transition(client, request.params.id, 'SUBMITTED', approved ? 'APPROVED' : 'REJECTED');
    await client.query('COMMIT');
    response.json(order);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

workflowRouter.post('/orders/:id/allocate', authorize('WAREHOUSE'), asyncHandler(async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const items = await client.query(`SELECT product_id, sum(quantity)::integer AS quantity FROM sales_order_items WHERE sales_order_id = $1 GROUP BY product_id`, [request.params.id]);
    if (!items.rows.length) throw badRequest('Order has no items');
    for (const item of items.rows) {
      const updated = await client.query(`UPDATE inventory SET quantity_on_hand = quantity_on_hand - $1, updated_at = now() WHERE product_id = $2 AND quantity_on_hand >= $1 RETURNING product_id`, [item.quantity, item.product_id]);
      if (!updated.rows[0]) throw badRequest('Insufficient inventory to allocate this order');
    }
    const order = await transition(client, request.params.id, 'APPROVED', 'ALLOCATED');
    await client.query('COMMIT');
    response.json(order);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

workflowRouter.post('/orders/:id/ship', authorize('WAREHOUSE'), asyncHandler(async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await transition(client, request.params.id, 'ALLOCATED', 'SHIPPED');
    await client.query('COMMIT');
    response.json(order);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

workflowRouter.post('/orders/:id/cancel', authorize('SALES_REP', 'SALES_MANAGER'), asyncHandler(async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT status, sales_rep_id FROM sales_orders WHERE id = $1 FOR UPDATE', [request.params.id]);
    if (!current.rows[0] || ['SHIPPED', 'INVOICED', 'CANCELLED'].includes(current.rows[0].status)) throw badRequest('This order cannot be cancelled');
    if (request.user.role === 'SALES_REP' && current.rows[0].sales_rep_id !== request.user.sub) throw badRequest('You can only cancel your own orders');
    if (current.rows[0].status === 'ALLOCATED') {
      const items = await client.query('SELECT product_id, sum(quantity)::integer AS quantity FROM sales_order_items WHERE sales_order_id = $1 GROUP BY product_id', [request.params.id]);
      for (const item of items.rows) await client.query('UPDATE inventory SET quantity_on_hand = quantity_on_hand + $1, updated_at = now() WHERE product_id = $2', [item.quantity, item.product_id]);
    }
    const result = await client.query("UPDATE sales_orders SET status = 'CANCELLED', updated_at = now() WHERE id = $1 RETURNING id, order_number AS \"orderNumber\", status", [request.params.id]);
    await client.query('COMMIT');
    response.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

workflowRouter.get('/inventory', authorize('WAREHOUSE', 'SALES_MANAGER'), asyncHandler(async (_request, response) => {
  const result = await query(`SELECT i.id, i.product_id AS "productId", p.sku, p.name, i.quantity_on_hand AS "quantityOnHand", i.reorder_level AS "reorderLevel", (i.quantity_on_hand <= i.reorder_level) AS "needsReorder", i.updated_at AS "updatedAt" FROM inventory i JOIN products p ON p.id = i.product_id ORDER BY p.name`);
  response.json({ data: result.rows });
}));

workflowRouter.patch('/inventory/:productId', authorize('WAREHOUSE'), asyncHandler(async (request, response) => {
  const input = z.object({ quantityOnHand: z.coerce.number().int().nonnegative(), reorderLevel: z.coerce.number().int().nonnegative().optional() }).parse(request.body);
  const result = await query('UPDATE inventory SET quantity_on_hand = $1, reorder_level = COALESCE($2, reorder_level), updated_at = now() WHERE product_id = $3 RETURNING product_id AS "productId", quantity_on_hand AS "quantityOnHand", reorder_level AS "reorderLevel"', [input.quantityOnHand, input.reorderLevel, request.params.productId]);
  if (!result.rows[0]) return response.status(404).json({ message: 'Inventory record not found' });
  return response.json(result.rows[0]);
}));

workflowRouter.get('/invoices', authorize('FINANCE', 'SALES_MANAGER'), asyncHandler(async (_request, response) => {
  const result = await query(`SELECT i.id, i.invoice_number AS "invoiceNumber", i.status, i.due_date AS "dueDate", i.total_amount AS "totalAmount", i.created_at AS "createdAt", o.order_number AS "orderNumber", c.name AS "customerName", COALESCE((SELECT sum(amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS "paidAmount" FROM invoices i JOIN sales_orders o ON o.id = i.sales_order_id JOIN customers c ON c.id = o.customer_id ORDER BY i.created_at DESC`);
  response.json({ data: result.rows });
}));

workflowRouter.post('/orders/:id/invoice', authorize('FINANCE'), asyncHandler(async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const source = await client.query('SELECT id, order_number, total_amount FROM sales_orders WHERE id = $1 AND status = $2 FOR UPDATE', [request.params.id, 'SHIPPED']);
    if (!source.rows[0]) throw badRequest('Order must be shipped before it can be invoiced');
    const order = source.rows[0];
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const invoice = await client.query(`INSERT INTO invoices (invoice_number, sales_order_id, due_date, total_amount) VALUES ($1, $2, current_date + 30, $3) RETURNING id, invoice_number AS "invoiceNumber", status, total_amount AS "totalAmount", due_date AS "dueDate"`, [invoiceNumber, order.id, order.total_amount]);
    await client.query(`INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, line_total) SELECT $1, oi.product_id, p.name, oi.quantity, oi.unit_price, oi.line_total FROM sales_order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.sales_order_id = $2`, [invoice.rows[0].id, order.id]);
    await client.query("UPDATE sales_orders SET status = 'INVOICED', updated_at = now() WHERE id = $1", [order.id]);
    await client.query('COMMIT');
    response.status(201).json(invoice.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

workflowRouter.post('/invoices/:id/payments', authorize('FINANCE'), asyncHandler(async (request, response) => {
  const input = z.object({ amount: z.coerce.number().positive(), method: z.string().min(2).max(40), reference: z.string().max(100).optional().nullable() }).parse(request.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoice = await client.query('SELECT id, total_amount FROM invoices WHERE id = $1 AND status = $2 FOR UPDATE', [request.params.id, 'OPEN']);
    if (!invoice.rows[0]) throw badRequest('Open invoice not found');
    const paid = await client.query('SELECT COALESCE(sum(amount), 0) AS total FROM payments WHERE invoice_id = $1', [request.params.id]);
    if (Number(paid.rows[0].total) + input.amount > Number(invoice.rows[0].total_amount)) throw badRequest('Payment exceeds outstanding balance');
    const payment = await client.query('INSERT INTO payments (invoice_id, amount, method, reference) VALUES ($1, $2, $3, $4) RETURNING id, amount, method, reference, paid_at AS "paidAt"', [request.params.id, input.amount, input.method, input.reference || null]);
    if (Number(paid.rows[0].total) + input.amount === Number(invoice.rows[0].total_amount)) await client.query("UPDATE invoices SET status = 'PAID', updated_at = now() WHERE id = $1", [request.params.id]);
    await client.query('COMMIT');
    response.status(201).json(payment.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

workflowRouter.get('/reports/dashboard', authorize('SALES_MANAGER', 'FINANCE'), asyncHandler(async (_request, response) => {
  const [orders, revenue, inventory] = await Promise.all([
    query('SELECT status, count(*)::integer AS count FROM sales_orders GROUP BY status'),
    query("SELECT COALESCE(sum(total_amount), 0) AS invoiced FROM invoices WHERE status IN ('OPEN', 'PAID')"),
    query('SELECT count(*)::integer AS low_stock FROM inventory WHERE quantity_on_hand <= reorder_level')
  ]);
  response.json({ ordersByStatus: orders.rows, invoicedRevenue: revenue.rows[0].invoiced, lowStockCount: inventory.rows[0].low_stock });
}));
