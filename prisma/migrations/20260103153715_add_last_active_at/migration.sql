-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_game_sessions" (
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
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_sessions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_sessions_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_game_sessions" ("createdAt", "currentQuestionIndex", "hostId", "id", "isActive", "pin", "players", "quizId", "state", "updatedAt") SELECT "createdAt", "currentQuestionIndex", "hostId", "id", "isActive", "pin", "players", "quizId", "state", "updatedAt" FROM "game_sessions";
DROP TABLE "game_sessions";
ALTER TABLE "new_game_sessions" RENAME TO "game_sessions";
CREATE UNIQUE INDEX "game_sessions_pin_key" ON "game_sessions"("pin");
CREATE INDEX "game_sessions_pin_idx" ON "game_sessions"("pin");
CREATE INDEX "game_sessions_quizId_idx" ON "game_sessions"("quizId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
