# Build Cache Fix

The error you're seeing is likely due to a build cache issue. The function `getLevelProgress` IS properly exported in `src/types.ts`, but the build system is having trouble resolving it.

## Quick Fix

Run these commands to clear caches and rebuild:

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear build artifacts
rm -rf dist

# Reinstall dependencies
npm install

# Rebuild
npm run build:prod
```

## What was fixed

1. Added `"type": "module"` to package.json to eliminate the ES module warning
2. The exports in src/types.ts are all correct and properly defined

The build should now work correctly. If you still encounter issues, you can try a complete clean install:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build:prod
```
