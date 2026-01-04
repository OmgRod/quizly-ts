import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import csrf from 'csurf';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import quizRoutes from './routes/quiz.js';
import gameRoutes from './routes/game.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import { setupSocketHandlers } from './socket.js';
import { validateInput, validatePagination } from './middleware/inputValidation.js';
import prisma from './prisma.js';

// Create __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Trust proxy headers (needed for express-rate-limit and X-Forwarded-For)
app.set('trust proxy', 1);

// Determine CORS origin based on environment
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? process.env.CLIENT_URL || 'http://localhost:3000'
  : process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers - Prevent XSS attacks
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;");
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
});

// Input validation and sanitization middleware
app.use(validateInput);
app.use(validatePagination);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'quizly-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// CSRF protection middleware
const csrfProtection = csrf({ cookie: false });

// GET endpoint to fetch CSRF token (no CSRF protection needed for GET)
app.get('/api/csrf-token', csrfProtection as any, (req, res) => {
  try {
    res.json({ csrfToken: (req as any).csrfToken() });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
});

// Apply CSRF protection to all other routes except safe methods
app.use((req, res, next) => {
  // Skip CSRF for safe methods
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  // Apply CSRF protection to POST, PUT, DELETE, PATCH
  (csrfProtection as any)(req, res, next);
});

// Serve static files from dist in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..');
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: false,
  }));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for client-side routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  });
}

// Setup Socket.IO
setupSocketHandlers(io);

const PORT = parseInt(process.env.PORT || '3001', 10);

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
