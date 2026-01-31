-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 100,
    "profilePicture" TEXT,
    "profileVisibility" BOOLEAN NOT NULL DEFAULT true,
    "showQuizStats" BOOLEAN NOT NULL DEFAULT true,
    "anonymousMode" BOOLEAN NOT NULL DEFAULT false,
    "adminRole" TEXT NOT NULL DEFAULT 'USER',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "acceptedTosVersion" TEXT DEFAULT '1.0.0',
    "acceptedPrivacyVersion" TEXT DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    "showJoinDate" BOOLEAN NOT NULL DEFAULT true,
    "showLastOnline" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pointType" TEXT NOT NULL DEFAULT 'NORMAL',
    "text" TEXT NOT NULL,
    "options" TEXT NOT NULL DEFAULT '[]',
    "correctIndices" TEXT,
    "correctTexts" TEXT,
    "correctSequence" TEXT,
    "correctValue" DOUBLE PRECISION,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "stepValue" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "correctRegions" TEXT,
    "targetLatLng" TEXT,
    "isCaseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "timeLimit" INTEGER NOT NULL DEFAULT 20,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "players" TEXT NOT NULL DEFAULT '[]',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'LOBBY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "quizId" TEXT,
    "reportedUserId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sid" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
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

-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");

-- CreateIndex
CREATE INDEX "reports_quizId_idx" ON "reports"("quizId");

-- CreateIndex
CREATE INDEX "reports_reportedUserId_idx" ON "reports"("reportedUserId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
