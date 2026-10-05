import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticateJWT);
router.use(requireSuperAdmin);

// Super Admin Overview Stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({ where: { isActive: true } });
    const suspendedCompanies = totalCompanies - activeCompanies;
    const totalOrders = await prisma.order.count();
    
    const orders = await prisma.order.findMany({
      select: { total: true },
    });
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    return res.json({
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalOrders,
      totalRevenue,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// List all companies
router.get('/companies', async (_req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
            items: true,
            documents: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Mask sensitive API keys when returning to the list
    const sanitized = companies.map(c => ({
      ...c,
      aiApiKey: c.aiApiKey ? `${c.aiApiKey.slice(0, 4)}••••••••${c.aiApiKey.slice(-4)}` : null,
      rawHasApiKey: !!c.aiApiKey,
    }));

    return res.json(sanitized);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Create new company from Super Admin
router.post('/companies', async (req: Request, res: Response) => {
  try {
    const { name, phone, deliveryFee, minOrderAmount, ownerEmail, ownerName, ownerPassword, aiProvider, aiModel, aiApiKey } = req.body;
    if (!name || !ownerEmail) {
      return res.status(400).json({ error: 'Name and Owner Email are required' });
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const slug = `${baseSlug}-${randomSuffix}`;

    const passwordHash = await bcrypt.hash(ownerPassword || 'password123', 10);

    const company = await prisma.company.create({
      data: {
        name,
        slug,
        phone: phone || null,
        deliveryFee: parseFloat(deliveryFee) || 3.0,
        minOrderAmount: parseFloat(minOrderAmount) || 10.0,
        isActive: true,
        aiProvider: aiProvider || 'gemini',
        aiModel: aiModel || 'gemini-1.5-flash',
        aiApiKey: aiApiKey || null,
        users: {
          create: {
            name: ownerName || 'Company Owner',
            email: ownerEmail.toLowerCase(),
            passwordHash,
            role: 'COMPANY_ADMIN',
          },
        },
      },
      include: {
        users: true,
      },
    });

    return res.status(201).json(company);
  } catch (err: any) {
    console.error('Superadmin create company error:', err);
    return res.status(500).json({ error: 'Failed to create company' });
  }
});

// Toggle Company Active / Suspended Status
router.patch('/companies/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive boolean is required' });
    }

    const updated = await prisma.company.update({
      where: { id: id as string },
      data: { isActive },
    });

    console.log(`[SuperAdmin] Company ${updated.name} status updated to: ${isActive ? 'ACTIVE' : 'SUSPENDED'}`);
    return res.json({ message: `Company status changed to ${isActive ? 'Active' : 'Suspended'}`, company: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update company status' });
  }
});

// Configure Company AI Provider & API Key
router.patch('/companies/:id/ai', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { aiProvider, aiModel, aiApiKey, aiCustomBaseUrl, aiSystemPrompt } = req.body;

    const data: any = {};
    if (aiProvider !== undefined) data.aiProvider = aiProvider;
    if (aiModel !== undefined) data.aiModel = aiModel;
    if (aiApiKey !== undefined) data.aiApiKey = aiApiKey;
    if (aiCustomBaseUrl !== undefined) data.aiCustomBaseUrl = aiCustomBaseUrl;
    if (aiSystemPrompt !== undefined) data.aiSystemPrompt = aiSystemPrompt;

    const updated = await prisma.company.update({
      where: { id: id as string },
      data,
    });

    return res.json({
      message: 'AI settings updated successfully',
      company: {
        ...updated,
        aiApiKey: updated.aiApiKey ? `${updated.aiApiKey.slice(0, 4)}••••••••${updated.aiApiKey.slice(-4)}` : null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update company AI configuration' });
  }
});

export default router;
