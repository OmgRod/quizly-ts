import { Router } from 'express';
import prisma from '../prisma.ts';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

// Create a new report (authenticated users only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    const { quizId, reportedUserId, reason, description } = req.body;

    // Validate that either quizId or reportedUserId is provided
    if (!quizId && !reportedUserId) {
      return res.status(400).json({ error: 'Either quizId or reportedUserId must be provided' });
    }

    // Don't allow reporting yourself
    if (reportedUserId === userId) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }

    // Validate reason
    const validReasons = [
      'INAPPROPRIATE_CONTENT',
      'SPAM',
      'PLAGIARISM',
      'OFFENSIVE_LANGUAGE',
      'CHEATING',
      'OTHER'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        quizId: quizId || null,
        reportedUserId: reportedUserId || null,
        reason,
        description: description || ''
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true
          }
        },
        quiz: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                username: true
              }
            }
          }
        },
        reportedUser: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.json({ success: true, report });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Get all reports (admin only) with pagination
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const ITEMS_PER_PAGE = 10;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const whereCondition: any = {};

    if (status) {
      whereCondition.status = status;
    }

    if (search) {
      whereCondition.OR = [
        { quiz: { title: { contains: search } } },
        { reportedUser: { username: { contains: search } } },
        { reporter: { username: { contains: search } } },
        { reason: { contains: search } }
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereCondition,
        include: {
          reporter: {
            select: {
              id: true,
              username: true
            }
          },
          quiz: {
            select: {
              id: true,
              title: true,
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          },
          reportedUser: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: ITEMS_PER_PAGE
      }),
      prisma.report.count({ where: whereCondition })
    ]);

    res.json({ reports, total, page, pageSize: ITEMS_PER_PAGE });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get report details (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            createdAt: true
          }
        },
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            user: {
              select: {
                id: true,
                username: true
              }
            },
            createdAt: true
          }
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            createdAt: true,
            isSuspended: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Update report status (admin only)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: { quiz: true, reportedUser: true }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // If action is required (e.g., suspend user or delete quiz)
    if (action === 'suspend_user' && report.reportedUserId) {
      await prisma.user.update({
        where: { id: report.reportedUserId },
        data: { isSuspended: true }
      });
    } else if (action === 'delete_quiz' && report.quizId) {
      await prisma.quiz.delete({
        where: { id: report.quizId }
      });
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: { status },
      include: {
        reporter: {
          select: { id: true, username: true }
        },
        quiz: {
          select: { id: true, title: true }
        },
        reportedUser: {
          select: { id: true, username: true }
        }
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

export default router;
