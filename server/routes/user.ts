import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidUUID, isValidImageUrl, isValidUsername } from '../middleware/inputValidation.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // limit each IP to 500 profile update requests per hour
  skip: (req) => {
    // Skip rate limiting for authenticated users
    return !!(req as any).session?.userId;
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Get global leaderboard
router.get('/leaderboard/global', async (req, res) => {
  try {
    // Sanitize and validate query parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 100); // 1-100 limit
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0); // Non-negative
    const type = (req.query.type as string) || 'xp';

    // Validate type to prevent injection
    const validTypes = ['xp', 'coins', 'points'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid sort type' });
    }

    // Determine sort field based on type (using whitelist)
    let orderBy: any;
    if (type === 'xp') {
      orderBy = { xp: 'desc' };
    } else if (type === 'coins') {
      orderBy = { coins: 'desc' };
    } else if (type === 'points') {
      orderBy = { totalPoints: 'desc' };
    } else {
      orderBy = { xp: 'desc' }; // Default fallback
    }

    const users = await prisma.user.findMany({
      where: {
        profileVisibility: true
      },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        xp: true,
        coins: true,
        profilePicture: true,
        createdAt: true
      },
      orderBy,
      take: limit,
      skip: offset
    });

    const total = await prisma.user.count({
      where: {
        profileVisibility: true
      }
    });

    res.json({ users, total });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.userId; // From session if authenticated

    // Validate user ID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        xp: true,
        coins: true,
        createdAt: true,
        profilePicture: true,
        profileVisibility: true,
        showQuizStats: true,
        anonymousMode: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if profile is private and requester is not the owner
    if (user.profileVisibility === false && requesterId !== user.id) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/profile', profileUpdateLimiter, requireAuth, async (req, res) => {
  try {
    const { username, currentPassword, newPassword, xp, coins, totalPoints, profilePicture, profileVisibility, showQuizStats, anonymousMode } = req.body;
    const userId = req.userId!;

    console.log('Profile update request:', {
      hasUsername: !!username,
      hasPassword: !!newPassword,
      hasXp: xp !== undefined,
      hasCoins: coins !== undefined,
      hasTotalPoints: totalPoints !== undefined,
      hasProfilePicture: !!profilePicture,
      profilePictureLength: profilePicture ? profilePicture.length : 0,
      profileVisibility,
      showQuizStats,
      anonymousMode
    });

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData: any = {};

    // Update username
    if (username && username !== user.username) {
      // Validate username format (alphanumeric only, 3-32 chars)
      if (!isValidUsername(username)) {
        return res.status(400).json({ error: 'Username must be alphanumeric only and between 3-32 characters' });
      }

      // Check if username is taken
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      updateData.username = username;
    }

    // Update password
    if (newPassword && currentPassword) {
      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);

      if (!validPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Update game rewards
    if (typeof xp === 'number') {
      updateData.xp = xp;
    }
    if (typeof coins === 'number') {
      updateData.coins = coins;
    }
    if (typeof totalPoints === 'number') {
      updateData.totalPoints = totalPoints;
    }

    // Update profile picture
    if (profilePicture) {
      if (!isValidImageUrl(profilePicture)) {
        return res.status(400).json({ error: 'Invalid image URL format' });
      }
      updateData.profilePicture = profilePicture;
      console.log('Saving profile picture, length:', profilePicture.length);
    }

    // Update privacy settings
    if (typeof profileVisibility === 'boolean') {
      updateData.profileVisibility = profileVisibility;
    }
    if (typeof showQuizStats === 'boolean') {
      updateData.showQuizStats = showQuizStats;
    }
    if (typeof anonymousMode === 'boolean') {
      updateData.anonymousMode = anonymousMode;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        isAdmin: true,
        isSuspended: true,
        acceptedTosVersion: true,
        acceptedPrivacyVersion: true
      }
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user account
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    await prisma.user.delete({
      where: { id: userId }
    });

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get user's quizzes
router.get('/:id/quizzes', async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.userId; // From session if authenticated

    // Validate user ID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Check if user has showQuizStats enabled
    const user = await prisma.user.findUnique({
      where: { id },
      select: { showQuizStats: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If showQuizStats is false and requester is not the owner, return empty array
    if (user.showQuizStats === false && requesterId !== id) {
      return res.json({ quizzes: [] });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { userId: id },
      include: {
        questions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ quizzes });
  } catch (error) {
    console.error('Get user quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch user quizzes' });
  }
});

// Accept legal updates
router.post('/accept-legal', requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const { tosVersion, privacyVersion } = req.body;

    await prisma.user.update({
      where: { id: userId },
      data: {
        acceptedTosVersion: tosVersion,
        acceptedPrivacyVersion: privacyVersion
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Accept legal updates error:', error);
    res.status(500).json({ error: 'Failed to save legal acceptance' });
  }
});

export default router;
