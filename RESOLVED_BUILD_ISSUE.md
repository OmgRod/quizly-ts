# Build Issue Resolution

## Problem
The Vite client build was failing with "QuestionType is not exported by src/types.js" error, even though:
- QuestionType was properly exported in src/types.ts
- TypeScript compilation showed no errors
- The exports were syntactically correct

## Root Cause
A stale compiled `src/types.js` file existed alongside `src/types.ts`. Rollup was reading the empty/invalid JavaScript file instead of compiling the TypeScript source, causing it to incorrectly claim the exports didn't exist.

## Solution
Deleted `src/types.js`. The build now:
1. Properly reads `src/types.ts`
2. TypeScript compiles it correctly
3. Rollup bundles it with all exports available
4. Client builds successfully ✅

## Build Status
- **Client Build**: ✅ SUCCESS (npm run client:build)
- **Server Build**: ❌ Pre-existing TypeScript errors (unrelated to this fix)
  - csurf type declarations missing
  - OllamaService grammar parameter type mismatch
  - Parameters need explicit types in quiz.ts and ollamaService.ts
  - rootDir configuration issue for importing from src/

## Prevention
- Ensure node_modules/.vite is cleared before building
- Don't commit compiled .js files if also committing .ts sources
- If you see "not exported" errors from Rollup, check for stale compiled files in the same directory
