import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import authRoutes from './routes/auth';
import quizRoutes from './routes/quiz';
import gameRoutes from './routes/game';
import userRoutes from './routes/user';
import { setupSocketHandlers } from './socket';
import { validateInput, validatePagination } from './middleware/inputValidation';
import prisma from './prisma';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Input validation and sanitization middleware
app.use(validateInput);
app.use(validatePagination);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'quizly-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Setup Socket.IO
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

// Clear all game sessions on startup
async function initializeServer() {
  try {
    const deletedCount = await prisma.gameSession.deleteMany({});
    console.log(`Cleared ${deletedCount.count} game session(s) from previous server instance`);
  } catch (error) {
    console.error('Failed to clear game sessions on startup:', error);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

initializeServer();

export { io };
