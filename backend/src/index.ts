import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Ładowanie zmiennych środowiskowych
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Importy tras
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import animalsRoutes from './routes/animals.js';
import adoptionsRoutes from './routes/adoptions.js';

import logger from './lib/logger.js';

// Upewnij się, że foldery na dane istnieją
['uploads', 'logs'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

if (!process.env.DATABASE_URL) {
  logger.error("BŁĄD KRYTYCZNY: Brak DATABASE_URL w pliku .env");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT;

// ─── BEZPIECZEŃSTWO ───────────────────────────────────────────────────────────

app.use(helmet());
//app.use(cors());

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// Limit dla "wrażliwych" ścieżek (logowanie, rejestracja)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 10,
  message: { error: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit ogólny dla reszty API
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuta
  max: 100,
  message: { error: 'Zwolnij! Wysyłasz zbyt wiele żądań.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
// Stosowanie limiterów
app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);


// Serwowanie plików statycznych (zdjęcia zwierząt)
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/', (req: Request, res: Response) => {
  res.send('API Systemu Adopcji działa poprawnie.');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/adoptions', adoptionsRoutes);

// ─── GLOBALNY ERROR HANDLER ───────────────────────────────────────────────────

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Logowanie szczegółów do pliku logs/error.log przez Winston
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  // Dla klienta zwracamy ogólny komunikat (bezpieczeństwo!)
  res.status(500).json({ error: 'Wystąpił wewnętrzny błąd serwera' });
});

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  logger.info(`🚀 Serwer wystartował na porcie ${PORT}`);
  console.log(`Serwer działa: http://localhost:${PORT}`);
});