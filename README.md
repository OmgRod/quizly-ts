# Quizly - Server-Side Architecture

This application has been refactored to use a full server-side architecture with:

## Architecture

### Backend (Server)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with Prisma ORM
- **Real-time**: Socket.IO for multiplayer functionality
- **Authentication**: Express sessions with bcrypt password hashing

### Frontend (Client)
- **Framework**: React with TypeScript
- **Routing**: React Router v6
- **State Management**: Context API for user authentication
- **API Client**: Axios for HTTP requests
- **Real-time**: Socket.IO client

## Project Structure

```
├── server/                 # Server-side code
│   ├── index.ts           # Express server setup
│   ├── prisma.ts          # Prisma client
│   ├── socket.ts          # Socket.IO handlers
│   ├── routes/            # API routes
│   │   ├── auth.ts        # Authentication endpoints
│   │   ├── quiz.ts        # Quiz CRUD endpoints
│   │   ├── game.ts        # Game session endpoints
│   │   └── user.ts        # User profile endpoints
│   └── middleware/
│       └── auth.ts        # Authentication middleware
├── src/                   # Client-side code
│   ├── pages/             # Page components
│   ├── components/        # Reusable components
│   ├── context/           # React context (UserContext)
│   ├── api.ts             # API client setup
│   ├── App.tsx            # Main app with routing
│   └── types.ts           # TypeScript types
├── prisma/
│   └── schema.prisma      # Database schema
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

The application uses SQLite as the database. Create a `.env` file:

```bash
cp .env.example .env
```

Then generate the Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-secret-key-here"
PORT=3001
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

Create a `.env` file in the root for Vite:

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Run the Application

Development mode (runs both server and client):

```bash
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Server
npm run server:dev

# Terminal 2 - Client
npm run client:dev
```

### 5. Build for Production

```bash
npm run build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Quizzes
- `GET /api/quiz` - Get all quizzes (with filters)
- `GET /api/quiz/:id` - Get quiz by ID
- `POST /api/quiz` - Create quiz (auth required)
- `PUT /api/quiz/:id` - Update quiz (auth required)
- `DELETE /api/quiz/:id` - Delete quiz (auth required)
- `POST /api/quiz/:id/play` - Increment play count

### Game Sessions
- `POST /api/game/create` - Create game session (auth required)
- `POST /api/game/join` - Join game session
- `GET /api/game/:pin` - Get game by PIN
- `PUT /api/game/:pin` - Update game session
- `POST /api/game/:pin/end` - End game and award points

### Users
- `GET /api/user/:id` - Get user profile
- `PUT /api/user/profile` - Update profile (auth required)
- `DELETE /api/user/account` - Delete account (auth required)
- `GET /api/user/:id/quizzes` - Get user's quizzes

## Socket.IO Events

### Client → Server
- `PLAYER_JOINED` - Player joins game lobby
- `LOBBY_UPDATE` - Host updates lobby
- `START_SIGNAL` - Host starts game
- `ANSWER_SUBMITTED` - Player submits answer
- `STATE_SYNC` - Host syncs game state
- `SCORE_SYNC` - Host syncs scores

### Server → Client
- `LOBBY_UPDATE` - Lobby players updated
- `START_SIGNAL` - Game starting
- `ANSWER_SUBMITTED` - Answer received
- `STATE_SYNC` - Game state changed
- `SCORE_SYNC` - Scores updated

## Key Changes from Original

1. **No more localStorage/sessionStorage for data persistence** - All data is stored in SQLite
2. **Proper routing** - React Router instead of manual state-based navigation
3. **Server-side sessions** - Secure authentication with express-session
4. **API-first architecture** - All operations go through REST API
5. **Separate pages** - Each route has its own page component
6. **Type-safe API client** - Axios with TypeScript
7. **Real database** - SQLite with Prisma ORM
8. **Socket.IO on server** - Real-time multiplayer properly handled server-side

## Development Tips

- The server runs on port 3001
- The client runs on port 5173
- Vite proxies `/api` requests to the server
- Hot reload works for both client and server
- Check browser console and server terminal for errors

## Production Deployment

For production:

1. Set up your database (SQLite file or migrate to PostgreSQL)
2. Set environment variables
3. Generate Prisma client: `npm run prisma:generate`
4. Run migrations: `npm run prisma:migrate`
5. Build: `npm run build`
6. Deploy server code to your hosting service
7. Deploy client build to a static host or serve from Express
