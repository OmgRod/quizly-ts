import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidUsername } from '../middleware/inputValidation.js';
import rateLimit from 'express-rate-limit';
import { CURRENT_TOS_VERSION, CURRENT_PRIVACY_VERSION } from '../constants/legalVersions.js';

const router = Router();

const meRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // limit each IP to 1000 requests per hour for this route
  skip: (req) => {
    // Skip rate limiting for authenticated users
    return !!(req as any).session?.userId;
  }
});

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate username format
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3-32 characters, alphanumeric only' });
    }

    // Validate password length
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 6-128 characters' });
    }

    // Check if user already exists (case-insensitive by getting all users and comparing)
    const allUsers = await prisma.user.findMany({
      select: { username: true }
    });
    
    const usernameLower = username.toLowerCase();
    const existingUser = allUsers.find((u: any) => u.username.toLowerCase() === usernameLower);

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with original casing
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        acceptedTosVersion: CURRENT_TOS_VERSION,
        acceptedPrivacyVersion: CURRENT_PRIVACY_VERSION
      },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        xp: true,
        coins: true,
        profilePicture: true,
        profileVisibility: true,
        showQuizStats: true,
        anonymousMode: true,
        adminRole: true,
        isSuspended: true,
        acceptedTosVersion: true,
        acceptedPrivacyVersion: true
      }
    });

    // Set session (httpOnly cookie is set automatically)
    req.session.userId = user.id;

    res.json({ user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user (case-insensitive by getting all users and comparing)
    const allUsers = await prisma.user.findMany({
      select: { 
        id: true,
        username: true,
        password: true,
        totalPoints: true,
        xp: true,
        coins: true,
        profilePicture: true,
        profileVisibility: true,
        showQuizStats: true,
        anonymousMode: true,
        adminRole: true,
        isSuspended: true,
        acceptedTosVersion: true,
        acceptedPrivacyVersion: true,
        createdAt: true,
        lastActiveAt: true
      }
    });
    
    const usernameLower = username.toLowerCase();
    const user = allUsers.find((u: any) => u.username.toLowerCase() === usernameLower);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update lastActiveAt
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        xp: true,
        coins: true,
        profilePicture: true,
        profileVisibility: true,
        showQuizStats: true,
        anonymousMode: true,
        adminRole: true,
        isSuspended: true,
        acceptedTosVersion: true,
        acceptedPrivacyVersion: true,
        createdAt: true,
        lastActiveAt: true
      }
    });

    // Set session (httpOnly cookie is set automatically)
    req.session.userId = updatedUser.id;

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', meRateLimiter, requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        xp: true,
        coins: true,
        profilePicture: true,
        profileVisibility: true,
        showQuizStats: true,
        anonymousMode: true,
        adminRole: true,
        isSuspended: true,
        acceptedTosVersion: true,
        acceptedPrivacyVersion: true,
        createdAt: true,
        lastActiveAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
