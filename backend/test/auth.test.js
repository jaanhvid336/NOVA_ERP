import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';

test('JWT payload preserves user role for authorization', () => {
  const token = jwt.sign({ sub: 'user-id', role: 'SALES_REP' }, config.jwtSecret, { expiresIn: '1m' });
  assert.equal(jwt.verify(token, config.jwtSecret).role, 'SALES_REP');
});
