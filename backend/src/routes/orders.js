import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { badRequest, asyncHandler } from '../utils/http.js';
import { paged, pagination } from '../utils/pagination.js';

const orderSchema = z.object({ customerId: z.string().uuid(), notes: z.string().max(2000).optional().nullable(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().positive() })).min(1) });
const orderColumns = `o.id, o.order_number AS "orderNumber", o.sales_rep_id AS "salesRepId", o.status, o.notes, o.subtotal, o.tax_amount AS "taxAmount", o.total_amount AS "totalAmount", o.created_at AS "createdAt", o.updated_at AS "updatedAt", c.id AS "customerId", c.name AS "customerName", u.full_name AS "salesRepName"`;
export const orderRouter = Router();
orderRouter.use(authenticate);

orderRouter.get('/', asyncHandler(async (request, response) => {
  const { page, pageSize, offset } = pagination(request.query);
  const where = ['1=1']; const values = [];
  if (request.user.role === 'SALES_REP') { values.push(request.user.sub); where.push(`o.sales_rep_id = $${values.length}`); }
  if (request.query.status) { values.push(request.query.status); where.push(`o.status = $${values.length}`); }
  const whereSql = where.join(' AND ');
  values.push(pageSize, offset);
  const data = await query(`SELECT ${orderColumns} FROM sales_orders o JOIN customers c ON c.id = o.customer_id JOIN users u ON u.id = o.sales_rep_id WHERE ${whereSql} ORDER BY o.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  const count = await query(`SELECT count(*) FROM sales_orders o WHERE ${whereSql}`, values.slice(0, -2));
  response.json(paged(data.rows, count.rows[0].count, { page, pageSize }));
}));

orderRouter.get('/:id', asyncHandler(async (request, response) => {
  const order = await query(`SELECT ${orderColumns} FROM sales_orders o JOIN customers c ON c.id = o.customer_id JOIN users u ON u.id = o.sales_rep_id WHERE o.id = $1`, [request.params.id]);
  if (!order.rows[0]) return response.status(404).json({ message: 'Order not found' });
  if (request.user.role === 'SALES_REP' && order.rows[0].salesRepId !== request.user.sub) return response.status(403).json({ message: 'You can only view your own orders' });
  const items = await query(`SELECT i.id, i.product_id AS "productId", p.sku, p.name, i.quantity, i.unit_price AS "unitPrice", i.line_total AS "lineTotal" FROM sales_order_items i JOIN products p ON p.id = i.product_id WHERE i.sales_order_id = $1`, [request.params.id]);
  return response.json({ ...order.rows[0], items: items.rows });
}));

orderRouter.post('/', authorize('SALES_REP', 'SALES_MANAGER'), asyncHandler(async (request, response) => {
  const input = orderSchema.parse(request.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const customer = await client.query('SELECT id FROM customers WHERE id = $1 AND active = true', [input.customerId]);
    if (!customer.rows[0]) throw badRequest('Customer is not active or does not exist');
    const ids = [...new Set(input.items.map((item) => item.productId))];
    const products = await client.query('SELECT id, unit_price FROM products WHERE id = ANY($1::uuid[]) AND active = true', [ids]);
    if (products.rows.length !== ids.length) throw badRequest('One or more products are inactive or do not exist');
    const prices = new Map(products.rows.map((product) => [product.id, Number(product.unit_price)]));
    const lines = input.items.map((item) => ({ ...item, unitPrice: prices.get(item.productId), lineTotal: Number((prices.get(item.productId) * item.quantity).toFixed(2)) }));
    const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = Number(subtotal.toFixed(2));
    const orderNumber = `SO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const created = await client.query(`INSERT INTO sales_orders (order_number, customer_id, sales_rep_id, notes, subtotal, total_amount) VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`, [orderNumber, input.customerId, request.user.sub, input.notes || null, total]);
    for (const line of lines) await client.query('INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)', [created.rows[0].id, line.productId, line.quantity, line.unitPrice, line.lineTotal]);
    await client.query('COMMIT');
    return response.status(201).json({ id: created.rows[0].id, orderNumber, status: 'DRAFT', totalAmount: total });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
