import { Router } from 'express';
import prisma from '../prisma';
import { requireAdmin } from '../middleware/admin';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all quizzes (admin only) with pagination and search
router.get('/quizzes', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = (req.query.search as string) || '';
    const ITEMS_PER_PAGE = 10;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const whereCondition = search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { user: { username: { contains: search } } }
          ]
        }
      : {};

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          },
          questions: {
            select: {
              id: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: ITEMS_PER_PAGE
      }),
      prisma.quiz.count({ where: whereCondition })
    ]);

    res.json({ quizzes, total, page, pageSize: ITEMS_PER_PAGE });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Failed to get quizzes' });
  }
});

// Get single quiz details for editing (admin only)
router.get('/quizzes/:id', requireAdmin, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        },
        questions: true
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

// Edit quiz (admin only)
router.put('/quizzes/:id', requireAdmin, async (req, res) => {
  try {
    const { title, description, genre, visibility } = req.body;

    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const updated = await prisma.quiz.update({
      where: { id: req.params.id },
      data: {
        title: title || quiz.title,
        description: description ?? quiz.description,
        genre: genre || quiz.genre,
        visibility: visibility || quiz.visibility
      },
      include: {
        user: {
          select: { id: true, username: true }
        },
        questions: true
      }
    });

    res.json({ quiz: updated });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz (admin only)
router.delete('/quizzes/:id', requireAdmin, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    await prisma.quiz.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Get all users (admin only) with pagination and search
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = (req.query.search as string) || '';
    const ITEMS_PER_PAGE = 10;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const whereCondition = search
      ? { username: { contains: search } }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          username: true,
          totalPoints: true,
          xp: true,
          coins: true,
          isAdmin: true,
          isSuspended: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: ITEMS_PER_PAGE
      }),
      prisma.user.count({ where: whereCondition })
    ]);

    res.json({ users, total, page, pageSize: ITEMS_PER_PAGE });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user details with quiz count (admin only)
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        xp: true,
        coins: true,
        isAdmin: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        quizzes: {
          select: { id: true, title: true }
        },
        sessions: {
          select: { id: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        ...user,
        quizCount: user.quizzes.length,
        sessionCount: user.sessions.length
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Edit user (admin only) - limited to specific fields
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { coins, isAdmin } = req.body;
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent removing own admin status
    if (isAdmin === false && req.userId === req.params.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        coins: coins ?? targetUser.coins,
        isAdmin: isAdmin ?? targetUser.isAdmin
      },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        xp: true,
        coins: true,
        isAdmin: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Suspend/unsuspend account (admin only)
router.post('/users/:id/suspend', requireAdmin, async (req, res) => {
  try {
    const { suspend } = req.body;

    // Prevent suspending own account
    if (suspend === true && req.userId === req.params.id) {
      return res.status(400).json({ error: 'Cannot suspend your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isSuspended: suspend
      },
      select: {
        id: true,
        username: true,
        isSuspended: true
      }
    });

    res.json({
      message: suspend ? 'Account suspended' : 'Account unsuspended',
      user: updated
    });
  } catch (error) {
    console.error('Suspend account error:', error);
    res.status(500).json({ error: 'Failed to suspend account' });
  }
});

// Delete user account (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    // Prevent deleting own account
    if (req.userId === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
