import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { authenticateJWT, requireCompany } from '../../middleware/auth';

const router = Router();
router.use(authenticateJWT);
router.use(requireCompany);

// List conversations
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const conversations = await prisma.conversation.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    });

    const parsed = conversations.map(c => {
      let turns: any[] = [];
      try {
        turns = JSON.parse(c.messages);
      } catch {
        turns = [];
      }
      return {
        id: c.id,
        customerPhone: c.customerPhone,
        updatedAt: c.updatedAt,
        messageCount: turns.length,
        lastMessage: turns[turns.length - 1]?.content || '',
        messages: turns,
      };
    });

    return res.json(parsed);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

export default router;
