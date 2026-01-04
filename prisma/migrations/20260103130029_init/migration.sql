-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quizzes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pointType" TEXT NOT NULL DEFAULT 'NORMAL',
    "text" TEXT NOT NULL,
    "options" TEXT NOT NULL DEFAULT '[]',
    "correctIndices" TEXT,
    "correctTexts" TEXT,
    "correctSequence" TEXT,
    "correctValue" REAL,
    "minValue" REAL,
    "maxValue" REAL,
    "stepValue" REAL,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "correctRegions" TEXT,
    "targetLatLng" TEXT,
    "isCaseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "timeLimit" INTEGER NOT NULL DEFAULT 20,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pin" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "players" TEXT NOT NULL DEFAULT '[]',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'LOBBY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_sessions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_sessions_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "quizzes_userId_idx" ON "quizzes"("userId");

-- CreateIndex
CREATE INDEX "quizzes_genre_idx" ON "quizzes"("genre");

-- CreateIndex
CREATE INDEX "questions_quizId_idx" ON "questions"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_pin_key" ON "game_sessions"("pin");

-- CreateIndex
CREATE INDEX "game_sessions_pin_idx" ON "game_sessions"("pin");

-- CreateIndex
CREATE INDEX "game_sessions_quizId_idx" ON "game_sessions"("quizId");
