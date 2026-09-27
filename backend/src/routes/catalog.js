import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { paged, pagination } from '../utils/pagination.js';

const productSchema = z.object({ sku: z.string().min(2).max(60), name: z.string().min(2).max(160), description: z.string().max(1000).optional().nullable(), unitPrice: z.coerce.number().nonnegative(), active: z.boolean().optional() });
const customerSchema = z.object({ code: z.string().min(2).max(30), name: z.string().min(2).max(160), email: z.string().email().optional().or(z.literal('')).nullable(), phone: z.string().max(40).optional().nullable(), billingAddress: z.string().max(2000).optional().nullable(), shippingAddress: z.string().max(2000).optional().nullable(), active: z.boolean().optional() });
const productColumns = 'id, sku, name, description, unit_price AS "unitPrice", active, created_at AS "createdAt", updated_at AS "updatedAt"';
const customerColumns = 'id, code, name, email, phone, billing_address AS "billingAddress", shipping_address AS "shippingAddress", active, created_at AS "createdAt", updated_at AS "updatedAt"';

export const catalogRouter = Router();
catalogRouter.use(authenticate);

catalogRouter.get('/products', asyncHandler(async (request, response) => {
  const { page, pageSize, offset } = pagination(request.query);
  const search = request.query.search?.trim() || '';
  const activeClause = request.query.active === 'false' ? '' : 'AND active = true';
  const values = [`%${search}%`, pageSize, offset];
  const result = await query(`SELECT ${productColumns} FROM products WHERE (sku ILIKE $1 OR name ILIKE $1) ${activeClause} ORDER BY name LIMIT $2 OFFSET $3`, values);
  const count = await query(`SELECT count(*) FROM products WHERE (sku ILIKE $1 OR name ILIKE $1) ${activeClause}`, [values[0]]);
  response.json(paged(result.rows, count.rows[0].count, { page, pageSize }));
}));

catalogRouter.post('/products', authorize('SALES_MANAGER'), asyncHandler(async (request, response) => {
  const item = productSchema.parse(request.body);
  const result = await query(`INSERT INTO products (sku, name, description, unit_price, active) VALUES ($1, $2, $3, $4, $5) RETURNING ${productColumns}`,
    [item.sku, item.name, item.description || null, item.unitPrice, item.active ?? true]);
  await query('INSERT INTO inventory (product_id) VALUES ($1)', [result.rows[0].id]);
  response.status(201).json(result.rows[0]);
}));

catalogRouter.patch('/products/:id', authorize('SALES_MANAGER'), asyncHandler(async (request, response) => {
  const item = productSchema.partial().parse(request.body);
  const result = await query(`UPDATE products SET sku = COALESCE($1, sku), name = COALESCE($2, name), description = COALESCE($3, description), unit_price = COALESCE($4, unit_price), active = COALESCE($5, active), updated_at = now() WHERE id = $6 RETURNING ${productColumns}`,
    [item.sku, item.name, item.description, item.unitPrice, item.active, request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ message: 'Product not found' });
  return response.json(result.rows[0]);
}));

catalogRouter.get('/customers', asyncHandler(async (request, response) => {
  const { page, pageSize, offset } = pagination(request.query);
  const search = request.query.search?.trim() || '';
  const result = await query(`SELECT ${customerColumns} FROM customers WHERE active = true AND (code ILIKE $1 OR name ILIKE $1) ORDER BY name LIMIT $2 OFFSET $3`, [`%${search}%`, pageSize, offset]);
  const count = await query('SELECT count(*) FROM customers WHERE active = true AND (code ILIKE $1 OR name ILIKE $1)', [`%${search}%`]);
  response.json(paged(result.rows, count.rows[0].count, { page, pageSize }));
}));

catalogRouter.post('/customers', authorize('SALES_REP', 'SALES_MANAGER'), asyncHandler(async (request, response) => {
  const item = customerSchema.parse(request.body);
  const result = await query(`INSERT INTO customers (code, name, email, phone, billing_address, shipping_address, active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${customerColumns}`,
    [item.code, item.name, item.email || null, item.phone || null, item.billingAddress || null, item.shippingAddress || null, item.active ?? true]);
  response.status(201).json(result.rows[0]);
}));

catalogRouter.patch('/customers/:id', authorize('SALES_REP', 'SALES_MANAGER'), asyncHandler(async (request, response) => {
  const item = customerSchema.partial().parse(request.body);
  const result = await query(`UPDATE customers SET code = COALESCE($1, code), name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), billing_address = COALESCE($5, billing_address), shipping_address = COALESCE($6, shipping_address), active = COALESCE($7, active), updated_at = now() WHERE id = $8 RETURNING ${customerColumns}`,
    [item.code, item.name, item.email || null, item.phone || null, item.billingAddress || null, item.shippingAddress || null, item.active, request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ message: 'Customer not found' });
  return response.json(result.rows[0]);
}));
