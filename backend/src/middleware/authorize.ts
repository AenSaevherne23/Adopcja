import { type Response, type NextFunction } from 'express';
import { type AuthRequest } from '../types.js';

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (req.user && userRole && allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({
          error: 'Brak uprawnień'
      });
    }
  };
};

export const isStaff = (req: AuthRequest): boolean => {
  return req.user?.role === 'ADMIN' || req.user?.role === 'MODERATOR';
};