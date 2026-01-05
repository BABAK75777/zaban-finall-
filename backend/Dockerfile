FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Cloud Run expects PORT env
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]

