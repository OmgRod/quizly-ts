# Build Output Structure

## Overview

This project is configured to keep **all compiled output in a single `dist/` folder**, preventing source files from being contaminated with compiled JavaScript.

## Client Build (Vite)

- **Source**: `src/**/*.ts`, `src/**/*.tsx`
- **Config**: `tsconfig.json` with `"noEmit": true`
- **Output**: `dist/` folder (handled by Vite bundler)
- **Process**: `npm run client:build` → Vite compiles and bundles to `dist/`

## Server Build (TypeScript)

- **Source**: `server/**/*`, `src/types.ts`
- **Config**: `tsconfig.server.json` with `"outDir": "./dist"`
- **Output**: `dist/` folder (compiled CommonJS)
- **Process**: `npm run server:build` → TypeScript compiles to `dist/`

## Directory Structure After Build

```
quizly-main/
├── src/                    # ← Source files ONLY (no .js files)
│   ├── types.ts           
│   ├── components/
│   ├── pages/
│   └── utils/
├── server/                 # ← Source files ONLY (no .js files)
│   ├── index.ts
│   ├── routes/
│   └── services/
├── dist/                   # ← All compiled output
│   ├── index.html
│   ├── assets/
│   └── server/
│       ├── index.js
│       ├── routes/
│       └── services/
└── node_modules/
```

## Why This Matters

1. **Prevents conflicts**: Source TypeScript files never get compiled alongside their .ts versions
2. **Clean repository**: Git doesn't track compiled files mixed with source
3. **Easier to manage**: All build artifacts in one location
4. **CI/CD friendly**: Clear separation between source and output

## Git Rules

The `.gitignore` now explicitly prevents compiled files in source directories:

```gitignore
src/**/*.js
src/**/*.js.map
src/**/*.d.ts
server/**/*.js
server/**/*.js.map
```

## Build Process

```bash
npm run build:prod    # Runs both builds
  ├─ npm run client:build  → Vite to dist/
  └─ npm run server:build  → tsc to dist/
```

Both client and server output go to the same `dist/` folder, which is then deployed.

## Running

- **Development**: `npm run dev` - Vite dev server + TypeScript watch
- **Production**: `npm run start:prod` - Serves from `dist/`

## Important

✅ Never manually run `tsc` in the src/ directory  
✅ Always use `npm run client:build && npm run server:build`  
✅ All output automatically goes to `dist/`
