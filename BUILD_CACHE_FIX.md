# Build Cache Fix

The error you're seeing indicates that `getLevelProgress` is not being recognized as an export from `src/types.ts`.

## Root Cause

Your Pi's repository might be out of sync with the latest changes. The `getLevelProgress` function is correctly exported in the main branch, but your local copy may not have it.

## Solution

**Option 1: Pull Latest Changes (Recommended)**

```bash
git fetch origin main
git pull origin main
npm install
npm run build:prod
```

**Option 2: Quick Cache Clear**

If you're already on the latest version, try:

```bash
rm -rf node_modules/.vite dist
npm install
npm run build:prod
```

**Option 3: Manual Verification**

To verify you have the latest `src/types.ts`, check if this function exists:

```bash
grep -n "export const getLevelProgress" src/types.ts
```

If it shows nothing, you need to pull the latest changes from the repository.

## What's in the latest version

The `src/types.ts` file should have three leveling utility functions:
1. `getLevelFromXP(xp)` - Converts XP to player level
2. `getXPForLevel(level)` - Gets XP requirement for a level
3. `getLevelProgress(xp)` - Gets detailed level progress info (used by Dashboard, UserProfile, Podium)

These are all properly exported and ready to use.

