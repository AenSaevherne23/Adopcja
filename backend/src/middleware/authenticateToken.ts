import { type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { type AuthRequest, type JwtPayload } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Brak zmiennej środowiskowej JWT_SECRET!'); // ← serwer nie wystartuje bez niej

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Brak tokena' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token nieprawidłowy lub wygasł' });
    req.user = decoded as JwtPayload;
    next();
  });
};