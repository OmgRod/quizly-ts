import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check session cookie for authentication
  if (req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }

  // No session - user is not authenticated
  return res.status(401).json({ error: 'Authentication required' });
};
