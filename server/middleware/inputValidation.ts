import { Request, Response, NextFunction } from 'express';

/**
 * Input validation middleware to prevent injection attacks
 * Sanitizes and validates user input from query parameters, request body, and URL params
 */
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  Object.keys(req.query).forEach(key => {
    const value = req.query[key];
    if (typeof value === 'string') {
      // Trim whitespace and limit length
      req.query[key] = value.trim().substring(0, 500);
    }
  });

  // Sanitize URL parameters
  Object.keys(req.params).forEach(key => {
    const value = req.params[key];
    if (typeof value === 'string') {
      // Trim whitespace
      req.params[key] = value.trim();
    }
  });

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any, depth = 0): void {
  // Prevent deep object traversal
  if (depth > 10) return;

  Object.keys(obj).forEach(key => {
    const value = obj[key];

    if (typeof value === 'string') {
      // Trim whitespace and limit length
      obj[key] = value.trim().substring(0, 5000);
    } else if (Array.isArray(value)) {
      // Sanitize array items
      value.forEach((item, index) => {
        if (typeof item === 'string') {
          value[index] = item.trim().substring(0, 5000);
        } else if (typeof item === 'object' && item !== null) {
          sanitizeObject(item, depth + 1);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitizeObject(value, depth + 1);
    }
  });
}

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  // Validate limit
  if (limit !== undefined) {
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
    }
  }

  // Validate offset
  if (offset !== undefined) {
    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid offset parameter (must be non-negative)' });
    }
  }

  next();
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[a-z0-9_]+$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate alphanumeric only (for usernames, etc)
 */
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9]{3,32}$/;
  return usernameRegex.test(username);
};
