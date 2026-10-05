import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { config } from '../../config';
import { authenticateJWT } from '../../middleware/auth';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.company && !user.company.isActive && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Your company subscription is suspended. Please contact platform admin.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register new company (B2B self-serve)
router.post('/register-company', async (req: Request, res: Response) => {
  try {
    const { companyName, ownerName, email, password, phone, deliveryFee } = req.body;
    if (!companyName || !ownerName || !email || !password) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const slug = `${baseSlug}-${randomSuffix}`;

    const passwordHash = await bcrypt.hash(password, 10);

    const newCompany = await prisma.company.create({
      data: {
        name: companyName,
        slug,
        phone: phone || null,
        deliveryFee: parseFloat(deliveryFee) || 3.0,
        isActive: true,
        aiProvider: 'gemini',
        aiModel: 'gemini-1.5-flash',
        users: {
          create: {
            name: ownerName,
            email: email.toLowerCase(),
            passwordHash,
            role: 'COMPANY_ADMIN',
          },
        },
      },
      include: {
        users: true,
      },
    });

    const user = newCompany.users[0];
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: newCompany.id,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: newCompany.id,
        company: newCompany,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register company' });
  }
});

// Current user profile
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      company: user.company,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

export default router;
