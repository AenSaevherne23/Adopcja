import { Router, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { authorize } from '../middleware/authorize.js';
import { type AuthRequest } from '../types.js';
import logger from '../lib/logger.js'; // Dodane logi

const router = Router();

/**
 * GET /api/users
 * Dostęp: ADMIN i MODERATOR
 */
router.get('/', authenticateToken, authorize(['ADMIN', 'MODERATOR']), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        user_id: true,
        email: true,
        createdAt: true,
        role: { select: { name: true } },
        _count: { select: { postedAnimals: true, adoptionRequests: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    logger.error("Błąd GET /api/users:", error);
    res.status(500).json({ error: 'Błąd serwera.' });
  }
});

/**
 * GET /api/users/me
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user!.userId as string },
      select: {
        user_id: true,
        email: true,
        role: { select: { name: true } },
        postedAnimals: true,
        adoptionRequests: { include: { animal: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika.' });
    res.json(user);
  } catch (error) {
    logger.error(`Błąd GET /api/users/me (User: ${req.user?.userId}):`, error);
    res.status(500).json({ error: 'Błąd serwera.' });
  }
});

/**
 * DELETE /api/users/:id
 * Dostęp: TYLKO ADMIN
 */
router.delete('/:id', authenticateToken, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (id === req.user?.userId) {
      logger.warn(`Admin ${req.user?.userId} próbował usunąć samego siebie.`);
      return res.status(400).json({ error: 'Nie możesz usunąć samego siebie.' });
    }

    await prisma.user.delete({
      where: { user_id: id } 
    });

    logger.info(`Użytkownik ${id} został usunięty przez Admina ${req.user?.userId}`);
    res.json({ message: 'Użytkownik usunięty.' });
  } catch (error) {
    logger.error(`Błąd DELETE /api/users/${req.params.id}:`, error);
    res.status(500).json({ error: 'Błąd podczas usuwania.' });
  }
});

/**
 * PATCH /api/users/:id/role
 * Dostęp: TYLKO ADMIN
 */
router.patch('/:id/role', authenticateToken, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    const validRoles = ['ADMIN', 'MODERATOR', 'NORMAL_USER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Nieprawidłowa rola.' });
    }

    const roleRecord = await prisma.role.findFirst({
      where: { name: role }
    });

    if (!roleRecord) return res.status(404).json({ error: 'Rola nie istnieje w bazie.' });

    await prisma.user.update({
      where: { user_id: id },
      data: { roleId: roleRecord.role_id }
    });

    logger.info(`Rola użytkownika ${id} zmieniona na ${role} przez Admina ${req.user?.userId}`);
    res.json({ message: `Zmieniono rolę na ${role}` });
  } catch (error) {
    logger.error(`Błąd PATCH /api/users/${req.params.id}/role:`, error);
    res.status(500).json({ error: 'Błąd serwera.' });
  }
});

export default router;