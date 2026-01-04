# Production Deployment Guide

## Build for Production

```bash
# Install dependencies
npm install

# Build both client and server
npm run build:prod

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:prod
```

## Running in Production

```bash
# Start the server (serves both API and built frontend)
npm start:prod
```

The production setup will:
- Serve the built React frontend from the Express server
- Handle client-side routing via catch-all route to index.html
- Use relative URLs for API calls (`/api/*`)
- Enable static file caching
- Remove all Vite development tooling

## Environment Variables

For production, set these environment variables:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:port/quizly
SESSION_SECRET=generate-a-secure-random-string
CLIENT_URL=https://yourdomain.com
AI_PROVIDER=gemini
API_KEY=your-gemini-api-key
```

## Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY dist ./dist
COPY prisma ./prisma

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start:prod"]
```

Build and run:
```bash
docker build -t quizly .
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e SESSION_SECRET="..." \
  -e PORT=3001 \
  quizly
```

## Architecture

```
Client Side:
- React SPA built by Vite into /dist/
- Served as static files by Express
- Uses relative URLs for API (/api/*)

Server Side:
- Express server on port 3001
- Handles API routes (/api/*)
- Socket.IO for real-time features
- Serves static frontend files

Database:
- Prisma ORM for database access
- Runs migrations on startup
- PostgreSQL for production
```

## Key Differences from Development

| Feature | Development | Production |
|---------|-------------|-----------|
| Client Dev Server | Vite (port 5173) | Static files served by Express |
| Hot Reload | ✅ Enabled | ❌ Disabled |
| API Base URL | `http://localhost:3001/api` | `/api` (relative) |
| CORS | Configured for localhost | Uses CLIENT_URL env var |
| Static Files | Not built | Pre-built in `/dist` |
| Server Restart | Auto with tsx watch | Manual or process manager |

## Notes

- The build process now correctly orders operations: client first, then server
- Server automatically detects production and serves static files
- Socket.IO and API routes continue to work as normal
- All client-side routing is handled by the React app with index.html fallback
