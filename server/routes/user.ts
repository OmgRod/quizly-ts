import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get global leaderboard
router.get('/leaderboard/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = (req.query.type as string) || 'xp'; // 'xp', 'coins', or 'points'

    // Determine sort field based on type
    let orderBy: any;
    if (type === 'xp') {
      orderBy = { xp: 'desc' };
    } else if (type === 'coins') {
      orderBy = { coins: 'desc' };
    } else {
      orderBy = { totalPoints: 'desc' };
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
router.put('/profile', requireAuth, async (req, res) => {
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
        anonymousMode: true
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

export default router;
