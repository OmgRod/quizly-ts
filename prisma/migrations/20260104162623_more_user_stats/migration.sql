-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 100,
    "profilePicture" TEXT,
    "profileVisibility" BOOLEAN NOT NULL DEFAULT true,
    "showQuizStats" BOOLEAN NOT NULL DEFAULT true,
    "anonymousMode" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "acceptedTosVersion" TEXT DEFAULT '1.0.0',
    "acceptedPrivacyVersion" TEXT DEFAULT '1.0.0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME,
    "showJoinDate" BOOLEAN NOT NULL DEFAULT true,
    "showLastOnline" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_users" ("acceptedPrivacyVersion", "acceptedTosVersion", "anonymousMode", "coins", "createdAt", "id", "isAdmin", "isSuspended", "password", "profilePicture", "profileVisibility", "showQuizStats", "totalPoints", "updatedAt", "username", "xp") SELECT "acceptedPrivacyVersion", "acceptedTosVersion", "anonymousMode", "coins", "createdAt", "id", "isAdmin", "isSuspended", "password", "profilePicture", "profileVisibility", "showQuizStats", "totalPoints", "updatedAt", "username", "xp" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
