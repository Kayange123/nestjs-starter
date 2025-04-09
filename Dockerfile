# Base stage
FROM node:slim AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Development stage
FROM dependencies AS development
COPY . .
EXPOSE 3030
CMD ["pnpm", "start:dev"]

# Build stage
FROM dependencies AS build
COPY . .
RUN pnpm build

# Production stage
FROM node:slim AS production
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
# Set HUSKY=0 to prevent husky installation in production
ENV HUSKY=0
RUN pnpm install --frozen-lockfile --production

# Copy build output
COPY --from=build /app/dist ./dist

EXPOSE 3030

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3030/v1/health/ping || exit 1

CMD ["node", "dist/main"]
