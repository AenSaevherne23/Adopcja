import { Router, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { isStaff } from '../middleware/authorize.js';
import { type AuthRequest } from '../types.js';
import { z } from 'zod';
import logger from '../lib/logger.js';

const router = Router();

// --- SCHEMATY WALIDACJI ---
const CreateRequestSchema = z.object({
  motivation: z.string()
    .min(10, "Uzasadnienie musi mieć co najmniej 10 znaków")
    .max(1000, "Uzasadnienie jest za długie")
});

const UpdateStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'])
});

// ─── 1. WYŚLIJ PROŚBĘ O ADOPCJĘ ─────────────────────────────────────────────
router.post('/request/:animalId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { animalId } = req.params as { animalId: string };
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

    const parsedBody = CreateRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.issues });
    }

    const animal = await prisma.animal.findUnique({ where: { animal_id: animalId } });

    if (!animal) return res.status(404).json({ error: "Nie znaleziono zwierzaka" });
    if (animal.is_adopted) return res.status(400).json({ error: "Ten zwierzak ma już dom" });

    if (animal.userId === userId) {
      logger.warn(`Użytkownik ${userId} próbował adoptować własne zwierzę: ${animalId}`);
      return res.status(400).json({ error: "Nie możesz adoptować własnego zwierzaka" });
    }

    const request = await prisma.adoptionRequest.create({
      data: {
        animalId,
        userId,
        motivation: parsedBody.data.motivation
      }
    });

    logger.info(`Wysłano prośbę o adopcję: Animal ${animalId} przez User ${userId}`);
    res.status(201).json({ message: "Prośba wysłana!", request });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
      return res.status(400).json({ error: "Już wysłałeś prośbę dla tego zwierzaka" });
    }
    logger.error("Błąd POST /request/:animalId:", error);
    res.status(503).json({ error: "Trwają prace serwisowe. Spróbuj ponownie później." });
  }
});

// ─── 2. MOJE WYSŁANE PROŚBY ─────────────────────────────────────────────────
router.get('/my-sent-requests', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

    const requests = await prisma.adoptionRequest.findMany({
      where: { userId },
      include: { animal: true }
    });
    res.json(requests);
  } catch (error) {
    logger.error("Błąd GET /my-sent-requests:", error);
    res.status(503).json({ error: "Trwają prace serwisowe. Spróbuj ponownie później." });
  }
});

// ─── 3. OTRZYMANE PROŚBY ────────────────────────────────────────────────────
router.get('/my-received-requests', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

    const requests = await prisma.adoptionRequest.findMany({
      where: isStaff(req) ? {} : { animal: { userId } },
      include: {
        animal: true,
        user: { select: { email: true } }
      }
    });
    res.json(requests);
  } catch (error) {
    logger.error("Błąd GET /my-received-requests:", error);
    res.status(503).json({ error: "Trwają prace serwisowe. Spróbuj ponownie później." });
  }
});

// ─── 4. DECYZJA O ADOPCJI (AKCEPTACJA/ODRZUCENIE) ───────────────────────────
router.patch('/status/:requestId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.params as { requestId: string };
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

    const parsedBody = UpdateStatusSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.issues });
    }
    const { status } = parsedBody.data;

    const request = await prisma.adoptionRequest.findUnique({
      where: { request_id: requestId },
      include: { animal: true }
    });

    if (!request) return res.status(404).json({ error: "Nie znaleziono prośby" });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Ta prośba została już rozpatrzona" });
    }

    const isOwner = request.animal.userId === userId;

    if (!isOwner && !isStaff(req)) {
      logger.warn(`Nieautoryzowana próba zmiany statusu prośby ${requestId} przez User ${userId}`);
      return res.status(403).json({ error: "Tylko właściciel lub administracja może zarządzać tą prośbą" });
    }

    if (status === 'approved' && request.animal.is_adopted) {
      return res.status(400).json({ error: "Ten zwierzak został już adoptowany przez kogoś innego" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.adoptionRequest.update({
        where: { request_id: requestId },
        data: { status }
      });

      if (status === 'approved') {
        await tx.animal.update({
          where: { animal_id: request.animalId },
          data: { is_adopted: true }
        });

        // Automatyczne odrzucenie innych oczekujących próśb o tego zwierzaka
        await tx.adoptionRequest.updateMany({
          where: {
            animalId: request.animalId,
            request_id: { not: requestId },
            status: 'pending'
          },
          data: { status: 'rejected' }
        });
      }
    });

    logger.info(`Zmieniono status prośby ${requestId} na ${status} przez User ${userId}`);
    res.json({ message: `Status zmieniony na: ${status}` });
  } catch (error) {
    logger.error(`Błąd PATCH /status:`, error);
    res.status(500).json({ error: "Błąd podczas procesowania decyzji" });
  }
});

export default router;