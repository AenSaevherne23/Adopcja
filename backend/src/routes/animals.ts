import { Router, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileTypeFromFile } from 'file-type';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { isStaff } from '../middleware/authorize.js';
import { type AuthRequest } from '../types.js';
import logger from '../lib/logger.js';

const router = Router();

// --- KONFIGURACJA LIMITÓW ---
const LIMITS = {
  name: { min: 3, max: 50 },
  desc: { min: 10, max: 1000 },
  fileSize: 5 * 1024 * 1024
};

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// --- 1. KONFIGURACJA SKŁADOWANIA ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// --- 2. MULTER MIDDLEWARE ---
const upload = multer({
  storage: storage,
  limits: { fileSize: LIMITS.fileSize },
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nieprawidłowy format pliku (tylko JPG, PNG, WEBP).'));
    }
  }
});

const deleteFile = async (filePath: string) => {
  try {
    const absolutePath = path.join(process.cwd(), filePath.startsWith('/') ? filePath.substring(1) : filePath);
    await fs.unlink(absolutePath);
  } catch (err) {
    logger.error(`Błąd podczas usuwania pliku ${filePath}:`, err);
  }
};

/**
 * POST /api/animals
 */
router.post('/', authenticateToken, (req: AuthRequest, res: Response, next: any) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Plik jest za duży! Maksymalnie 5MB.' });
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Musisz dodać zdjęcie!' });

    const type = await fileTypeFromFile(req.file.path);
    if (!type || !ALLOWED_EXTENSIONS.includes(type.ext)) {
      await deleteFile(req.file.path);
      logger.warn(`Niebezpieczny plik odrzucony: ${req.file.originalname} (User: ${req.user?.userId})`);
      return res.status(400).json({ error: 'Przesłany plik nie jest prawdziwym obrazkiem!' });
    }

    if (!name || name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
      await deleteFile(req.file.path);
      return res.status(400).json({ error: `Imię musi mieć od ${LIMITS.name.min} do ${LIMITS.name.max} znaków.` });
    }
    if (!description || description.length < LIMITS.desc.min || description.length > LIMITS.desc.max) {
      await deleteFile(req.file.path);
      return res.status(400).json({ error: `Opis musi mieć od ${LIMITS.desc.min} do ${LIMITS.desc.max} znaków.` });
    }

    const newAnimal = await prisma.animal.create({
      data: {
        name,
        description,
        image: `/uploads/${req.file.filename}`,
        userId: String(req.user?.userId),
      }
    });

    logger.info(`Nowe ogłoszenie: ${name} (ID: ${newAnimal.animal_id}) dodane przez ${req.user?.userId}`);
    res.status(201).json(newAnimal);
  } catch (error) {
    if (req.file) await deleteFile(req.file.path);
    logger.error("Błąd POST /api/animals:", error);
    res.status(500).json({ error: 'Błąd podczas tworzenia ogłoszenia' });
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
    logger.error("Błąd GET /api/animals:", error);
    res.status(500).json({ error: "Nie udało się pobrać ogłoszeń" });
  }
});

/**
 * PATCH /api/animals/:id
 */
router.patch('/:id', authenticateToken, (req: AuthRequest, res: Response, next: any) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;

    const animal = await prisma.animal.findUnique({ where: { animal_id: id } });
    if (!animal) {
      if (req.file) await deleteFile(req.file.path);
      return res.status(404).json({ error: "Nie znaleziono ogłoszenia" });
    }

    const isOwner = animal.userId === req.user?.userId;

    if (!isOwner && !isStaff(req)) {
      if (req.file) await deleteFile(req.file.path);
      logger.warn(`Nieautoryzowana próba edycji ID: ${id} przez User: ${req.user?.userId}`);
      return res.status(403).json({ error: "Brak uprawnień do edycji" });
    }

    if (req.file) {
      const type = await fileTypeFromFile(req.file.path);
      if (!type || !ALLOWED_EXTENSIONS.includes(type.ext)) {
        await deleteFile(req.file.path);
        return res.status(400).json({ error: 'Nowy plik nie jest prawdziwym obrazkiem!' });
      }
    }

    const updateData: any = {};
    if (name) {
      if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
        if (req.file) await deleteFile(req.file.path);
        return res.status(400).json({ error: "Nieprawidłowa długość imienia." });
      }
      updateData.name = name;
    }
    if (description) {
      if (description.length < LIMITS.desc.min || description.length > LIMITS.desc.max) {
        if (req.file) await deleteFile(req.file.path);
        return res.status(400).json({ error: "Nieprawidłowa długość opisu." });
      }
      updateData.description = description;
    }

    if (req.file) {
      if (animal.image) await deleteFile(animal.image);
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedAnimal = await prisma.animal.update({
      where: { animal_id: id },
      data: updateData
    });

    logger.info(`Zaktualizowano ogłoszenie ID: ${id} przez ${req.user?.userId}`);
    res.json(updatedAnimal);
  } catch (error) {
    if (req.file) await deleteFile(req.file.path);
    logger.error(`Błąd PATCH /api/animals/${req.params.id}:`, error);
    res.status(500).json({ error: "Błąd podczas edycji" });
  }
});

/**
 * DELETE /api/animals/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const animal = await prisma.animal.findUnique({ where: { animal_id: id } });

    if (!animal) return res.status(404).json({ error: "Nie znaleziono ogłoszenia" });

    const isOwner = animal.userId === req.user?.userId;

    if (!isOwner && !isStaff(req)) {
      logger.warn(`Nieautoryzowana próba usunięcia ID: ${id} przez User: ${req.user?.userId}`);
      return res.status(403).json({ error: "Brak uprawnień" });
    }

    if (animal.image) await deleteFile(animal.image);
    await prisma.animal.delete({ where: { animal_id: id } });

    logger.info(`Usunięto ogłoszenie ID: ${id} przez ${req.user?.userId}`);
    res.json({ message: "Ogłoszenie usunięte" });
  } catch (error) {
    logger.error(`Błąd DELETE /api/animals/${req.params.id}:`, error);
    res.status(500).json({ error: "Błąd podczas usuwania" });
  }
});

export default router;