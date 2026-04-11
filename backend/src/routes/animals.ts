import { Router, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileTypeFromFile } from 'file-type';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { isStaff } from '../middleware/authorize.js';
import { type AuthRequest } from '../types.js';
import logger from '../lib/logger.js';

const router = Router();

// --- KONFIGURACJA LIMITÓW ---
const LIMITS = {
  name: { min: 2, max: 50 },
  breed: { min: 2, max: 50 },
  desc: { min: 10, max: 1000 },
  fileSize: 5 * 1024 * 1024 // 5MB
};

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const SAFE_TEXT = /^[^<>{}()\[\]'";]*$/;

// --- WALIDACJA ZOD ---
const AnimalSchema = z.object({
  name: z.string()
    .min(LIMITS.name.min, `Imię musi mieć co najmniej ${LIMITS.name.min} znaki`)
    .max(LIMITS.name.max, `Imię może mieć maksymalnie ${LIMITS.name.max} znaków`)
    .trim()
    .regex(SAFE_TEXT, "Imię zawiera niedozwolone znaki"),
  cat_breed: z.string()
    .min(LIMITS.breed.min, `Rasa musi mieć co najmniej ${LIMITS.breed.min} znaki`)
    .max(LIMITS.breed.max, `Rasa może mieć maksymalnie ${LIMITS.breed.max} znaków`)
    .trim()
    .regex(SAFE_TEXT, "Rasa zawiera niedozwolone znaki"),
  description: z.string()
    .min(LIMITS.desc.min, `Opis musi mieć co najmniej ${LIMITS.desc.min} znaków`)
    .max(LIMITS.desc.max, `Opis może mieć maksymalnie ${LIMITS.desc.max} znaków`)
    .trim()
    .regex(SAFE_TEXT, "Opis zawiera niedozwolone znaki"),
});

const AnimalUpdateSchema = AnimalSchema.partial();

// --- KONFIGURACJA MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `animal-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: LIMITS.fileSize },
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nieprawidłowy format pliku (tylko JPG, PNG, WEBP).') as any);
    }
  }
});

// --- POMOCNIK USUWANIA PLIKÓW ---
const deleteFile = async (filePath: string) => {
  try {
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const absolutePath = path.join(process.cwd(), normalizedPath);
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!absolutePath.startsWith(uploadsDir)) {
      logger.warn(`Próba usunięcia pliku poza katalogiem uploads: ${absolutePath}`);
      return;
    }

    await fs.unlink(absolutePath);
  } catch (err) {
    logger.error(`Błąd podczas usuwania pliku ${filePath}:`, err);
  }
};

/**
 * POST /api/animals
 */
router.post('/', authenticateToken, (req: AuthRequest, res: Response, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Musisz dodać zdjęcie!' });

    const type = await fileTypeFromFile(req.file.path);
    if (!type || !ALLOWED_EXTENSIONS.includes(type.ext)) {
      await deleteFile(req.file.path);
      return res.status(400).json({ error: 'Przesłany plik nie jest prawdziwym obrazkiem!' });
    }

    const parsed = AnimalSchema.safeParse(req.body);
    if (!parsed.success) {
      await deleteFile(req.file.path);
      return res.status(400).json({ error: 'Błędne dane', details: parsed.error.issues });
    }

    const newAnimal = await prisma.animal.create({
      data: {
        ...parsed.data,
        image: `/uploads/${req.file.filename}`,
        userId: String(req.user?.userId),
      }
    });

    logger.info(`Dodano: ${newAnimal.name} przez ${req.user?.userId}`);
    res.status(201).json(newAnimal);
  } catch (error) {
    if (req.file) await deleteFile(req.file.path);
    logger.error("Błąd POST /api/animals:", error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

/**
 * GET /api/animals
 */
router.get('/', async (req, res) => {
  try {
    const animals = await prisma.animal.findMany({
      where: { is_adopted: false },
      include: { author: { select: { email: true } } }
    });
    res.json(animals);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania danych" });
  }
});

/**
 * PATCH /api/animals/:id
 */
router.patch('/:id', authenticateToken, (req: AuthRequest, res: Response, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.userId;

    const animal = await prisma.animal.findUnique({ where: { animal_id: id } });
    if (!animal) {
      if (req.file) await deleteFile(req.file.path);
      return res.status(404).json({ error: "Nie znaleziono" });
    }

    if (animal.userId !== userId && !isStaff(req)) {
      if (req.file) await deleteFile(req.file.path);
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    const parsed = AnimalUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      if (req.file) await deleteFile(req.file.path);
      return res.status(400).json({ error: 'Błędne dane', details: parsed.error.issues });
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    if (req.file) {
      const type = await fileTypeFromFile(req.file.path);
      if (!type || !ALLOWED_EXTENSIONS.includes(type.ext)) {
        await deleteFile(req.file.path);
        return res.status(400).json({ error: 'To nie jest obrazek' });
      }
      if (animal.image) await deleteFile(animal.image);
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedAnimal = await prisma.animal.update({
      where: { animal_id: id },
      data: updateData
    });

    res.json(updatedAnimal);
  } catch (error) {
    if (req.file) await deleteFile(req.file.path);
    logger.error("Błąd PATCH:", error);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

/**
 * DELETE /api/animals/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.userId;

    const animal = await prisma.animal.findUnique({ where: { animal_id: id } });
    if (!animal) return res.status(404).json({ error: "Nie znaleziono" });

    if (animal.userId !== userId && !isStaff(req)) {
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    if (animal.image) await deleteFile(animal.image);
    await prisma.animal.delete({ where: { animal_id: id } });

    res.json({ message: "Usunięto" });
  } catch (error) {
    logger.error("Błąd DELETE /api/animals:", error);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

export default router;