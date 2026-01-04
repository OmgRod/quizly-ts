import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { generateToken, requireAuth } from '../middleware/auth';
import { isValidUsername } from '../middleware/inputValidation';

const router = Router();

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
      return res.status(400).json({ error: 'Username must be 3-32 characters, alphanumeric with - and _ only' });
    }

    // Validate password length
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 6-128 characters' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
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
        anonymousMode: true
      }
    });

    // Set session
    req.session.userId = user.id;

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    res.json({ user, token });
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.userId = user.id;

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        totalPoints: user.totalPoints,
        xp: user.xp,
        coins: user.coins,
        profilePicture: user.profilePicture,
        profileVisibility: user.profileVisibility,
        showQuizStats: user.showQuizStats,
        anonymousMode: user.anonymousMode
      },
      token
    });
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
router.get('/me', requireAuth, async (req, res) => {
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
        anonymousMode: true
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
