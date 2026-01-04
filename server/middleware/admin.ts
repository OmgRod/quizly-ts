import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      adminRole?: string;
    }
  }
}

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { adminRole: true, isSuspended: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    if (user.adminRole !== 'ADMIN' && user.adminRole !== 'MODERATOR') {
      return res.status(403).json({ error: 'Admin or Moderator access required' });
    }

    req.userId = userId;
    req.adminRole = user.adminRole;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};
