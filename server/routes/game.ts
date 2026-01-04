import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

// Helper to deserialize questions from quiz
const deserializeQuestion = (q: any) => ({
  ...q,
  options: q.options ? JSON.parse(q.options) : [],
  correctIndices: q.correctIndices ? JSON.parse(q.correctIndices) : [],
  correctTexts: q.correctTexts ? JSON.parse(q.correctTexts) : null,
  correctSequence: q.correctSequence ? JSON.parse(q.correctSequence) : null,
  correctRegions: q.correctRegions ? JSON.parse(q.correctRegions) : null,
  targetLatLng: q.targetLatLng ? JSON.parse(q.targetLatLng) : null
});

const router = Router();

// Create game session
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { quizId, solo } = req.body;
    const userId = req.session.userId!;

    // Validate quiz visibility and ownership before allowing hosting
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const visibility = (quiz.visibility || 'PUBLIC').toUpperCase();
    if (visibility === 'DRAFT') {
      return res.status(403).json({ error: 'Draft quizzes cannot be hosted' });
    }

    if (visibility === 'PRIVATE' && quiz.userId !== userId) {
      return res.status(403).json({ error: 'Only the creator can host a private quiz' });
    }

    // Generate unique PIN
    const pin = Math.abs(Math.random() * 1000000 | 0).toString().padStart(6, '0');

    // If solo mode, add bots to the initial players array
    const initialPlayers = solo ? [
      { id: 'bot1', name: 'CyberLink', score: 0, lastAnswerCorrect: false, streak: 0, isBot: true },
      { id: 'bot2', name: 'NeuralX', score: 0, lastAnswerCorrect: false, streak: 0, isBot: true }
    ] : [];

    const session = await prisma.gameSession.create({
      data: {
        pin,
        quizId,
        hostId: userId,
        players: JSON.stringify(initialPlayers)
      }
    });

    // Deserialize data
    const deserializedSession = {
      ...session,
      players: JSON.parse(session.players),
      quiz: {
        ...quiz,
        questions: quiz.questions.map(deserializeQuestion)
      }
    };

    res.json({ session: deserializedSession, pin: session.pin });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game session' });
  }
});

// Join game session
router.post('/join', async (req, res) => {
  try {
    const { pin, playerName, userId } = req.body;

    const session = await prisma.gameSession.findUnique({
      where: { pin },
      include: {
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const visibility = (session.quiz.visibility || 'PUBLIC').toUpperCase();
    const hostIsCreator = session.quiz.userId === session.hostId;
    if (visibility === 'DRAFT') {
      return res.status(403).json({ error: 'This draft quiz cannot be hosted' });
    }

    if (visibility === 'PRIVATE' && !hostIsCreator) {
      return res.status(403).json({ error: 'This private quiz can only be hosted by its creator' });
    }

    if (!session.isActive) {
      return res.status(410).json({ error: 'Game has already started and is no longer joinable' });
    }

    // Deserialize players
    const players = JSON.parse(session.players);
    const existingPlayer = players.find((p: any) => 
      (userId && p.userId === userId) || p.name === playerName
    );

    // Deserialize data
    const deserializedSession = {
      ...session,
      players,
      quiz: {
        ...session.quiz,
        questions: session.quiz.questions.map(deserializeQuestion)
      }
    };

    if (existingPlayer) {
      return res.json({ session: deserializedSession, player: existingPlayer });
    }

    res.json({ session: deserializedSession });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Get game session by PIN
router.get('/:pin', async (req, res) => {
  try {
    const { pin } = req.params;

    const session = await prisma.gameSession.findUnique({
      where: { pin },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: {
                orderIndex: 'asc'
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const visibility = (session.quiz.visibility || 'PUBLIC').toUpperCase();
    const hostIsCreator = session.quiz.userId === session.hostId;
    if (visibility === 'DRAFT') {
      return res.status(403).json({ error: 'This draft quiz cannot be hosted' });
    }

    if (visibility === 'PRIVATE' && !hostIsCreator) {
      return res.status(403).json({ error: 'This private quiz can only be hosted by its creator' });
    }

    if (!session.isActive) {
      return res.status(410).json({ error: 'This game session has ended or does not exist' });
    }

    // Deserialize data
    const deserializedSession = {
      ...session,
      players: JSON.parse(session.players),
      quiz: {
        ...session.quiz,
        questions: session.quiz.questions.map(deserializeQuestion)
      }
    };

    res.json({ session: deserializedSession });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to fetch game session' });
  }
});

// Update game session
router.put('/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    const { players, currentQuestionIndex, state, isActive } = req.body;

    const updateData: any = {};
    if (players !== undefined) updateData.players = JSON.stringify(players);
    if (currentQuestionIndex !== undefined) updateData.currentQuestionIndex = currentQuestionIndex;
    if (state !== undefined) updateData.state = state;
    if (isActive !== undefined) updateData.isActive = isActive;

    const session = await prisma.gameSession.update({
      where: { pin },
      data: updateData
    });

    // Deserialize data
    const deserializedSession = {
      ...session,
      players: JSON.parse(session.players)
    };

    res.json({ session: deserializedSession });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ error: 'Failed to update game session' });
  }
});

// End game and award points
router.post('/:pin/end', async (req, res) => {
  try {
    const { pin } = req.params;
    const { players } = req.body;

    const session = await prisma.gameSession.update({
      where: { pin },
      data: {
        isActive: false,
        players: JSON.stringify(players)
      }
    });

    // Award XP and points to logged-in players
    for (const player of players as any[]) {
      if (player.userId) {
        const xpGain = Math.floor(player.score / 10);
        const coinsGain = Math.floor(player.score / 100);
        
        await prisma.user.update({
          where: { id: player.userId },
          data: {
            totalPoints: {
              increment: player.score
            },
            xp: {
              increment: xpGain
            },
            coins: {
              increment: coinsGain
            }
          }
        });
      }
    }

    // Deserialize data
    const deserializedSession = {
      ...session,
      players: JSON.parse(session.players)
    };

    res.json({ session: deserializedSession });
  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

export default router;
