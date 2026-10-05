import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { authenticateJWT, requireCompany } from '../../middleware/auth';

const router = Router();
router.use(authenticateJWT);
router.use(requireCompany);

// Get current tenant profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId! },
    });
    return res.json(company);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch company profile' });
  }
});

// Update company profile & delivery settings
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { name, phone, deliveryFee, minOrderAmount, currency, aiSystemPrompt } = req.body;
    
    const updated = await prisma.company.update({
      where: { id: req.user!.companyId! },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        deliveryFee: deliveryFee !== undefined ? parseFloat(deliveryFee) : undefined,
        minOrderAmount: minOrderAmount !== undefined ? parseFloat(minOrderAmount) : undefined,
        currency: currency !== undefined ? currency : undefined,
        aiSystemPrompt: aiSystemPrompt !== undefined ? aiSystemPrompt : undefined,
      },
    });

    return res.json({ message: 'Settings saved successfully', company: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update company settings' });
  }
});

export default router;
