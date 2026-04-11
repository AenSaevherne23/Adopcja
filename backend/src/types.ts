import { type Request } from 'express';

export type JwtPayload = { 
  userId: string; 
  email: string; 
  role: 'ADMIN' | 'MODERATOR' | 'NORMAL_USER'; 
};

export interface AuthRequest extends Request {
  user?: JwtPayload;
}