# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/master-app/package.json ./packages/master-app/
COPY packages/selector-app/package.json ./packages/selector-app/
COPY packages/command-center-app/package.json ./packages/command-center-app/
COPY packages/pids-core/package.json ./packages/pids-core/
COPY packages/shared/package.json ./packages/shared/

RUN npm install
COPY . .
RUN npm run build

# --- STAGE 2: Backend Runner ---
FROM node:20-alpine AS backend
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 3001
CMD ["node", "packages/master-app/server.js"]

# --- STAGE 3: Frontend Web Runner ---
FROM nginx:alpine AS frontend
COPY --from=builder /app/packages/master-app/dist /usr/share/nginx/html/master
COPY --from=builder /app/packages/selector-app/dist /usr/share/nginx/html/selector
COPY --from=builder /app/packages/command-center-app/dist /usr/share/nginx/html/cc
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
