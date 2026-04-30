# Use Node 20
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy all packages package.json to leverage caching
COPY packages/master-app/package.json ./packages/master-app/
COPY packages/selector-app/package.json ./packages/selector-app/
COPY packages/command-center-app/package.json ./packages/command-center-app/
COPY packages/pids-core/package.json ./packages/pids-core/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build all apps
RUN npm run build

# Final Runner Stage
FROM node:20-alpine

WORKDIR /app

# Copy everything from builder (or just what's needed)
COPY --from=builder /app /app

# Expose API port (matching API_PORT in .env, default 3001)
EXPOSE 3001

# Command to run the backend
CMD ["node", "packages/master-app/server.js"]
