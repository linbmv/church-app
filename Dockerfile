# Multi-stage build for church-app (frontend + backend)
FROM node:20-alpine AS base

# Build frontend
FROM base AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM base AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Final production image with nginx + node
FROM nginx:alpine AS production

# Install Node.js in nginx image
RUN apk add --no-cache nodejs npm

# Copy frontend build to nginx
COPY --from=frontend-builder /app/frontend/build /usr/share/nginx/html

# Copy backend
COPY --from=backend-builder /app/backend /app/backend
WORKDIR /app/backend

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 80 8080

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
