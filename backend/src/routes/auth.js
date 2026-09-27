import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authRouter = Router();

authRouter.post('/login', asyncHandler(async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'Provide a valid email and password' });
  const { email, password } = parsed.data;
  const result = await query(
    'SELECT id, full_name, email, password_hash, role FROM users WHERE lower(email) = lower($1) AND active = true',
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return response.status(401).json({ message: 'Invalid email or password' });
  }
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.full_name }, config.jwtSecret, { expiresIn: '8h' });
  return response.json({ token, user: { id: user.id, name: user.full_name, email: user.email, role: user.role } });
}));

authRouter.get('/me', authenticate, asyncHandler(async (request, response) => {
  const result = await query('SELECT id, full_name, email, role FROM users WHERE id = $1 AND active = true', [request.user.sub]);
  const user = result.rows[0];
  if (!user) return response.status(401).json({ message: 'Account is no longer active' });
  return response.json({ id: user.id, name: user.full_name, email: user.email, role: user.role });
}));
