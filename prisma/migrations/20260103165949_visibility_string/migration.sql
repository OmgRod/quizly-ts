-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quizzes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quizzes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_quizzes" ("authorName", "createdAt", "description", "genre", "id", "playCount", "title", "updatedAt", "userId") SELECT "authorName", "createdAt", "description", "genre", "id", "playCount", "title", "updatedAt", "userId" FROM "quizzes";
DROP TABLE "quizzes";
ALTER TABLE "new_quizzes" RENAME TO "quizzes";
CREATE INDEX "quizzes_userId_idx" ON "quizzes"("userId");
CREATE INDEX "quizzes_genre_idx" ON "quizzes"("genre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
