import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { isValidUUID, sanitizeText } from '../middleware/inputValidation';
import { generateQuizFromAI, modifyQuizWithAI } from '../services/aiService';
import rateLimit from 'express-rate-limit';

// Rate limiter for AI endpoints to prevent abuse / DoS
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // limit each IP/user to 500 AI requests per hour
  skip: (req) => {
    // Skip rate limiting for authenticated users
    return !!(req as any).session?.userId;
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Helper to serialize JSON fields to strings for SQLite
const serializeQuestion = (q: any, index: number) => ({
  type: q.type,
  pointType: q.pointType || 'NORMAL',
  text: q.text,
  options: JSON.stringify(q.options || []),
  correctIndices: JSON.stringify(q.correctIndices || []),
  correctTexts: q.correctTexts ? JSON.stringify(q.correctTexts) : null,
  correctSequence: q.correctSequence ? JSON.stringify(q.correctSequence) : null,
  correctValue: q.correctValue,
  minValue: q.minValue,
  maxValue: q.maxValue,
  stepValue: q.stepValue,
  imageUrl: q.imageUrl,
  audioUrl: q.audioUrl,
  correctRegions: q.correctRegions ? JSON.stringify(q.correctRegions) : null,
  targetLatLng: q.targetLatLng ? JSON.stringify(q.targetLatLng) : null,
  isCaseSensitive: q.isCaseSensitive || false,
  timeLimit: q.timeLimit || 20,
  orderIndex: index
});

// Helper to deserialize JSON strings back to objects/arrays
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

// Character limits
const LIMITS = {
  QUIZ_TITLE: 100,
  QUIZ_DESCRIPTION: 500,
  QUESTION_TEXT: 300,
  ANSWER_OPTION: 150,
  CORRECT_ANSWER: 150
};

const normalizeVisibility = (v: any): 'PUBLIC' | 'PRIVATE' | 'DRAFT' => {
  if (v === 'PRIVATE') return 'PRIVATE';
  if (v === 'DRAFT') return 'DRAFT';
  return 'PUBLIC';
};

// Validate character limits
const validateCharacterLimits = (quiz: any): string | null => {
  if (quiz?.title) {
    if (quiz.title.length > LIMITS.QUIZ_TITLE) {
      return `Quiz title exceeds ${LIMITS.QUIZ_TITLE} character limit (${quiz.title.length} characters)`;
    }
  }

  if (quiz?.description) {
    if (quiz.description.length > LIMITS.QUIZ_DESCRIPTION) {
      return `Quiz description exceeds ${LIMITS.QUIZ_DESCRIPTION} character limit (${quiz.description.length} characters)`;
    }
  }

  if (Array.isArray(quiz?.questions)) {
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const label = `Question ${i + 1}`;

      if (q?.text && q.text.length > LIMITS.QUESTION_TEXT) {
        return `${label} text exceeds ${LIMITS.QUESTION_TEXT} character limit (${q.text.length} characters)`;
      }

      if (Array.isArray(q?.options)) {
        for (let j = 0; j < q.options.length; j++) {
          const option = q.options[j];
          if (option && String(option).length > LIMITS.ANSWER_OPTION) {
            return `${label} option ${j + 1} exceeds ${LIMITS.ANSWER_OPTION} character limit (${String(option).length} characters)`;
          }
        }
      }

      if (Array.isArray(q?.correctTexts)) {
        for (let j = 0; j < q.correctTexts.length; j++) {
          const answer = q.correctTexts[j];
          if (answer && String(answer).length > LIMITS.CORRECT_ANSWER) {
            return `${label} correct answer ${j + 1} exceeds ${LIMITS.CORRECT_ANSWER} character limit (${String(answer).length} characters)`;
          }
        }
      }

      if (Array.isArray(q?.correctSequence)) {
        for (let j = 0; j < q.correctSequence.length; j++) {
          const step = q.correctSequence[j];
          if (step && String(step).length > LIMITS.ANSWER_OPTION) {
            return `${label} sequence step ${j + 1} exceeds ${LIMITS.ANSWER_OPTION} character limit (${String(step).length} characters)`;
          }
        }
      }
    }
  }

  return null;
};

// Basic playability validation to prevent saving unplayable quizzes
const validatePlayableQuiz = (quiz: any): string | null => {
  // Check character limits first
  const limitError = validateCharacterLimits(quiz);
  if (limitError) return limitError;

  if (!quiz?.title || !quiz.title.trim()) {
    return 'Quiz title is required';
  }

  if (!quiz?.genre) {
    return 'Quiz genre is required';
  }

  if (!Array.isArray(quiz?.questions) || quiz.questions.length === 0) {
    return 'At least one question is required';
  }

  const allowedTypes = new Set(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'INPUT', 'PUZZLE', 'POLL', 'WORD_CLOUD', 'AUDIO_QUIZ', 'IMAGE_QUIZ']);

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const label = `Question ${i + 1}`;

    if (!q?.text || !q.text.trim()) {
      return `${label} is missing text`;
    }

    if (!allowedTypes.has(q?.type)) {
      return `${label} has an unsupported type`;
    }

    if (typeof q.timeLimit !== 'number' || q.timeLimit <= 0) {
      return `${label} has an invalid time limit`;
    }

    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE' || q.type === 'AUDIO_QUIZ' || q.type === 'IMAGE_QUIZ') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return `${label} needs at least two options`;
      }
      if (!Array.isArray(q.correctIndices) || q.correctIndices.length === 0) {
        return `${label} must have at least one correct option`;
      }
    }

    if (q.type === 'TRUE_FALSE') {
      if (q.options.length !== 2) {
        return `${label} must have exactly two options (True/False)`;
      }
    }

    if (q.type === 'INPUT') {
      if (!Array.isArray(q.correctTexts) || q.correctTexts.length === 0) {
        return `${label} must include at least one accepted answer`;
      }
    }

    if (q.type === 'PUZZLE') {
      if (!Array.isArray(q.correctSequence) || q.correctSequence.length < 2) {
        return `${label} must include an ordered sequence with at least two steps`;
      }
    }

    if (q.type === 'WORD_CLOUD') {
      // WORD_CLOUD just needs text, no options or correct answers needed
    }

    if (q.type === 'AUDIO_QUIZ' && !q.audioUrl) {
      return `${label} is missing an audio URL`;
    }

    if (q.type === 'IMAGE_QUIZ' && !q.imageUrl) {
      return `${label} is missing an image URL`;
    }
  }

  return null;
};

// Normalize AI responses to ensure required fields and retain ownership metadata
const normalizeAiQuiz = (incoming: any, original: any) => {
  const baseQuiz = original || {};
  const aiQuestions = incoming?.questions || baseQuiz.questions || [];

  const normalizeQuestion = (q: any, index: number) => {
    const type = q?.type || 'MULTIPLE_CHOICE';
    const pointType = q?.pointType || 'NORMAL';
    const timeLimit = typeof q?.timeLimit === 'number' ? q.timeLimit : 20;
    const options = Array.isArray(q?.options) ? q.options : [];
    const correctIndices = Array.isArray(q?.correctIndices) ? q.correctIndices.map((n: any) => Number(n)).filter((n: any) => !Number.isNaN(n)) : [];
    const correctTexts = Array.isArray(q?.correctTexts) ? q.correctTexts : undefined;
    const correctSequence = Array.isArray(q?.correctSequence) ? q.correctSequence : undefined;

    if (type === 'TRUE_FALSE') {
      if (options.length !== 2) {
        q.options = ['True', 'False'];
      }
      if (!correctIndices.length) {
        correctIndices.push(0);
      }
    }

    if (type === 'MULTIPLE_CHOICE' && options.length < 2) {
      q.options = ['Option A', 'Option B'];
    }

    if (type === 'PUZZLE' && (!correctSequence || correctSequence.length < 3)) {
      q.correctSequence = correctSequence?.length >= 2 ? correctSequence : ['Step 1', 'Step 2', 'Step 3'];
    }

    if (type === 'INPUT' && (!correctTexts || correctTexts.length === 0)) {
      q.correctTexts = ['correct answer'];
    }

    if (type === 'WORD_CLOUD') {
      // WORD_CLOUD only needs the prompt text, no options or answers
      q.options = [];
      q.correctIndices = [];
      q.correctTexts = undefined;
      q.correctSequence = undefined;
    }

    if (type === 'AUDIO_QUIZ') {
      if (options.length < 2) {
        q.options = ['Option A', 'Option B', 'Option C', 'Option D'];
      }
      if (correctIndices.length === 0) {
        q.correctIndices = [0];
      }
      if (!q.audioUrl) {
        q.audioUrl = '';
      }
    }

    if (type === 'IMAGE_QUIZ') {
      if (options.length < 2) {
        q.options = ['Option A', 'Option B', 'Option C', 'Option D'];
      }
      if (correctIndices.length === 0) {
        q.correctIndices = [0];
      }
      if (!q.imageUrl) {
        q.imageUrl = '';
      }
    }

    return {
      id: q?.id || `ai-q-${Date.now()}-${index}`,
      type,
      pointType,
      text: q?.text || `Question ${index + 1}`,
      options: q?.options || options,
      correctIndices,
      correctTexts: q?.correctTexts || correctTexts,
      correctSequence: q?.correctSequence || correctSequence,
      timeLimit,
      imageUrl: q?.imageUrl,
      audioUrl: q?.audioUrl,
      isCaseSensitive: Boolean(q?.isCaseSensitive),
      targetLatLng: q?.targetLatLng,
      correctRegions: q?.correctRegions,
      minValue: q?.minValue,
      maxValue: q?.maxValue,
      stepValue: q?.stepValue,
      correctValue: q?.correctValue
    };
  };

  const normalizedQuestions = aiQuestions.map((q: any, idx: number) => normalizeQuestion(q, idx));

  return {
    ...baseQuiz,
    ...incoming,
    id: baseQuiz.id,
    userId: baseQuiz.userId,
    authorName: baseQuiz.authorName,
    visibility: normalizeVisibility(incoming?.visibility || baseQuiz.visibility),
    genre: incoming?.genre || baseQuiz.genre,
    description: incoming?.description ?? baseQuiz.description ?? '',
    playCount: baseQuiz.playCount ?? 0,
    questions: normalizedQuestions
  };
};

// AI Quiz Generation endpoint
router.post('/ai/generate', requireAuth, aiLimiter, async (req, res) => {
  try {
    const { topic, count } = req.body;
    const userId = req.session.userId!;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    console.log(`[AI] Generating quiz for topic: "${topic}", count: ${count || 5}, userId: ${userId}`);
    const quiz = await generateQuizFromAI(topic, count || 5, userId);
    console.log(`[AI] Successfully generated quiz: ${quiz.title}`);
    
    res.json({ quiz });
  } catch (error) {
    console.error('[AI] Quiz generation error:', error);
    const message = error instanceof Error ? error.message : 'AI is currently unavailable. Please try again.';
    res.status(500).json({ error: message });
  }
});

// AI Quiz Modification endpoint
router.post('/ai/modify', requireAuth, aiLimiter, async (req, res) => {
  try {
    const { quiz, instruction, questionCount } = req.body;
    const userId = req.session.userId!;

    const start = Date.now();
    console.log('[AI][modify] request', {
      userId,
      quizId: quiz?.id || 'unsaved',
      questionCount: Array.isArray(quiz?.questions) ? quiz.questions.length : 0,
      instructionSnippet: typeof instruction === 'string' ? instruction.slice(0, 120) : 'invalid',
      visibility: quiz?.visibility,
      requestedQuestionCount: questionCount || 'not specified'
    });

    if (!quiz || !instruction) {
      return res.status(400).json({ error: 'Quiz and instruction are required' });
    }

    const modifiedQuiz = await modifyQuizWithAI(quiz, instruction, questionCount || undefined);
    console.log('[AI][modify] raw response', {
      userId,
      quizId: quiz?.id || 'unsaved',
      questionCount: Array.isArray(modifiedQuiz?.questions) ? modifiedQuiz.questions.length : 0,
      durationMs: Date.now() - start
    });

    const normalized = normalizeAiQuiz(modifiedQuiz, quiz);
    console.log('[AI][modify] normalized', {
      userId,
      quizId: normalized?.id || quiz?.id || 'unsaved',
      questionCount: Array.isArray(normalized?.questions) ? normalized.questions.length : 0,
      durationMs: Date.now() - start
    });
    
    res.json({ quiz: normalized });
  } catch (error) {
    console.error('AI quiz modification error:', error);
    const message = error instanceof Error ? error.message : 'AI is currently unavailable. Please try again.';
    res.status(500).json({ error: message });
  }
});

// Get all quizzes or filter by genre/search
router.get('/', async (req, res) => {
  try {
    const { genre, search, userId, sort } = req.query;
    const viewerId = req.session?.userId as string | undefined;

    // Sanitize and validate query parameters
    const sanitizedGenre = genre ? String(genre).trim() : null;
    const sanitizedSearch = search ? String(search).trim().substring(0, 100) : null; // Max 100 chars
    const sanitizedUserId = userId ? String(userId).trim() : null;
    const sanitizedSort = sort ? String(sort).trim() : null;

    // Validate sort to prevent injection (whitelist approach)
    const validSorts = ['updated', 'oldest', 'name', 'trending', 'popular'];
    if (sanitizedSort && !validSorts.includes(sanitizedSort)) {
      return res.status(400).json({ error: 'Invalid sort parameter' });
    }

    const where: any = {};
    
    if (sanitizedGenre && sanitizedGenre !== 'All') {
      where.genre = sanitizedGenre;
    }
    
    if (sanitizedSearch) {
      where.OR = [
        {
          title: {
            contains: sanitizedSearch
          }
        },
        {
          description: {
            contains: sanitizedSearch
          }
        }
      ];
    }
    
    if (sanitizedUserId) {
      where.userId = sanitizedUserId;
      const isOwner = viewerId && viewerId === sanitizedUserId;
      if (!isOwner) {
        where.visibility = 'PUBLIC';
      }
    } else {
      // Explore feed: only public published quizzes
      where.visibility = 'PUBLIC';
    }

    // Determine sort order using whitelist
    let orderBy: any = { createdAt: 'desc' }; // default
    if (sanitizedSort === 'updated') {
      orderBy = { updatedAt: 'desc' };
    } else if (sanitizedSort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sanitizedSort === 'name') {
      orderBy = { title: 'asc' };
    } else if (sanitizedSort === 'trending' || sanitizedSort === 'popular') {
      orderBy = { playCount: 'desc' };
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        questions: true,
        user: {
          select: {
            username: true,
            profilePicture: true
          }
        }
      },
      orderBy
    });

    // Deserialize JSON strings back to objects
    const deserializedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      authorName: quiz.user.username,
      authorProfilePicture: quiz.user.profilePicture,
      questions: quiz.questions.map(deserializeQuestion)
    }));

    res.json({ quizzes: deserializedQuizzes });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get single quiz
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.session?.userId as string | undefined;

    // Validate quiz ID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        user: {
          select: {
            username: true,
            profilePicture: true
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const isOwner = viewerId && viewerId === quiz.userId;
    if (!isOwner && quiz.visibility !== 'PUBLIC') {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Deserialize JSON strings back to objects
    const deserializedQuiz = {
      ...quiz,
      questions: quiz.questions.map(deserializeQuestion)
    };

    res.json({ quiz: deserializedQuiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Create quiz (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, genre, description, questions, visibility } = req.body;
    const userId = req.session.userId!;

    const validationError = validatePlayableQuiz({ title, genre, questions });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: sanitizeText(title),
        genre,
        description: sanitizeText(description || ''),
        visibility: normalizeVisibility(visibility),
        authorName: user.username,
        userId,
        questions: {
          create: questions.map((q: any) => serializeQuestion({
            ...q,
            text: sanitizeText(q.text),
            options: (q.options || []).map((opt: any) => sanitizeText(opt)),
            correctTexts: (q.correctTexts || []).map((text: any) => sanitizeText(text))
          }, q.__index || 0))
        }
      },
      include: {
        questions: true
      }
    });

    // Deserialize JSON strings back to objects
    const deserializedQuiz = {
      ...quiz,
      questions: quiz.questions.map(deserializeQuestion)
    };

    res.json({ quiz: deserializedQuiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Update quiz (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, genre, description, questions, visibility } = req.body;
    const userId = req.session.userId!;

    // Validate quiz ID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }

    const validationError = validatePlayableQuiz({ title, genre, questions });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Check if user owns this quiz
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (existingQuiz.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this quiz' });
    }

    // Delete existing questions
    await prisma.question.deleteMany({
      where: { quizId: id }
    });

    // Update quiz with new questions
    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        title: sanitizeText(title),
        genre,
        description: sanitizeText(description),
        visibility: normalizeVisibility(visibility || existingQuiz.visibility),
        questions: {
          create: questions.map((q: any) => serializeQuestion({
            ...q,
            text: sanitizeText(q.text),
            options: (q.options || []).map((opt: any) => sanitizeText(opt)),
            correctTexts: (q.correctTexts || []).map((text: any) => sanitizeText(text))
          }, q.__index || 0))
        }
      },
      include: {
        questions: true
      }
    });

    // Deserialize JSON strings back to objects
    const deserializedQuiz = {
      ...quiz,
      questions: quiz.questions.map(deserializeQuestion)
    };

    res.json({ quiz: deserializedQuiz });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz (requires auth)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId!;

    // Validate quiz ID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }

    // Check if user owns this quiz
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (existingQuiz.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this quiz' });
    }

    await prisma.quiz.delete({
      where: { id }
    });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Increment play count
router.post('/:id/play', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate quiz ID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        playCount: {
          increment: 1
        }
      }
    });

    res.json({ quiz });
  } catch (error) {
    console.error('Increment play count error:', error);
    res.status(500).json({ error: 'Failed to update play count' });
  }
});

export default router;
