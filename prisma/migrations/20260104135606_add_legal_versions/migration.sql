-- AlterTable
ALTER TABLE "users" ADD COLUMN "acceptedPrivacyVersion" TEXT DEFAULT '1.0.0';
ALTER TABLE "users" ADD COLUMN "acceptedTosVersion" TEXT DEFAULT '1.0.0';
