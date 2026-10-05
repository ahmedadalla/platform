import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
};

export const requireCompany = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super admins can pass companyId in query or header if they are impersonating/inspecting
  const companyId = req.user.companyId || (req.user.role === 'SUPER_ADMIN' ? (req.query.companyId as string || req.headers['x-company-id'] as string) : null);

  if (!companyId) {
    return res.status(400).json({ error: 'No company associated with this account' });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  if (!company.isActive && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      error: 'Company account is currently suspended. Please contact platform support.' 
    });
  }

  req.user.companyId = company.id;
  next();
};
