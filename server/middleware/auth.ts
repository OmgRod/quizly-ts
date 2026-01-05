import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    req.userId = req.session.userId;
    try {
      const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
      if (user?.isSuspended) {
        return res.status(403).json({ error: 'Your account is suspended.', code: 'ERR_SUSPENDED' });
      }
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};
