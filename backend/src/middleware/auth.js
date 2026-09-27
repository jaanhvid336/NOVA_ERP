import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function authenticate(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ message: 'Authentication token is required' });
  try {
    request.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return response.status(401).json({ message: 'Authentication token is invalid or expired' });
  }
}

export function authorize(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    return next();
  };
}
