FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Workspace packages referenced by backend/package.json file: deps
COPY packages/dictionary-languages ./packages/dictionary-languages
COPY packages/ai-prompt-validation ./packages/ai-prompt-validation

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

COPY backend/ ./

# Cloud Run expects PORT env
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
