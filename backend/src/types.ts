import { type Request } from 'express';

// Definicja tego, co faktycznie znajduje się w Twoim tokenie JWT
export type JwtPayload = { 
  userId: string; 
  email: string; 
   role: 'ADMIN' | 'MODERATOR' | 'NORMAL_USER'; 
};

// Rozszerzenie standardowego żądania Express o dane użytkownika
export interface AuthRequest extends Request {
  user?: JwtPayload;
}