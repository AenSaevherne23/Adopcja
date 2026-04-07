import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import logger from '../lib/logger.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Brak zmiennej środowiskowej JWT_SECRET! Ustaw ją w pliku .env');

// ─── WALIDACJA ────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  password: z.string().min(1, "Hasło jest wymagane")
});

const RegisterSchema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  password: z.string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę")
    .regex(/[^A-Za-z0-9]/, "Hasło musi zawierać co najmniej jeden znak specjalny")
}).refine((data) => {
  const localPart = data.email?.split('@')[0]?.toLowerCase();
  if (!localPart) return true;
  const segments = localPart.split(/[.\-_]/);
  const password = data.password.toLowerCase();
  return !segments.some(segment => segment.length > 2 && password.includes(segment));
}, {
  message: "Hasło nie może zawierać nazwy użytkownika z adresu email",
  path: ["password"]
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Użytkownik o takim adresie e-mail już istnieje' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultRole = await prisma.role.findFirst({
      where: { name: 'NORMAL_USER' }
    });
    if (!defaultRole) {
      logger.error("BŁĄD KRYTYCZNY: Nie znaleziono roli NORMAL_USER w tabeli roles podczas rejestracji.");
      return res.status(500).json({ error: 'Błąd konfiguracji serwera (brak ról)' });
    }
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roleId: defaultRole.role_id
      }
    });
    logger.info(`Nowy użytkownik zarejestrowany: ${email} (ID: ${user.user_id})`);
    res.status(201).json({
      message: 'Konto zostało utworzone pomyślnie',
      userId: user.user_id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Błędne dane', details: error.issues });
    }
    logger.error("Błąd podczas rejestracji użytkownika:", error);
    res.status(500).json({ error: 'Wystąpił błąd podczas tworzenia konta' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      logger.warn(`Nieudana próba logowania na konto: ${email}`);
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }
    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role.name
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    logger.info(`Użytkownik zalogowany: ${email} (Rola: ${user.role.name})`);
    res.json({
      token,
      user: {
        email: user.email,
        role: user.role.name
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
    logger.error("Błąd podczas logowania:", error);
    res.status(500).json({ error: 'Coś poszło nie tak' });
  }
});

export default router;