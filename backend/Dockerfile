# ============================================
# Multi-stage Dockerfile for Backend
# ============================================

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build arguments
ARG NODE_ENV=production
ARG VERSION=1.0.0
ARG COMMIT_SHA=unknown
ARG BUILD_DATE=unknown

ENV NODE_ENV=${NODE_ENV}
ENV VERSION=${VERSION}
ENV COMMIT_SHA=${COMMIT_SHA}
ENV BUILD_DATE=${BUILD_DATE}

# Build application (if needed)
RUN npm run build 2>/dev/null || echo "No build script"

# Stage 3: Production
FROM node:18-alpine AS production
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY --from=builder /app ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]

# Stage 4: Development
FROM node:18-alpine AS development
WORKDIR /app

ENV NODE_ENV=development

# Install all dependencies including devDependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Expose port
EXPOSE 8080

# Run in development mode
CMD ["npm", "run", "dev"]
