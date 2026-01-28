# Development Dockerfile for WhiteNote
# This image supports both development (with hot reload) and production modes

FROM node:24.13.0-alpine

# Set working directory
WORKDIR /app

# Install system dependencies required for native modules
RUN apk add --no-cache libc6-compat gcompat

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
# Most native modules (Prisma, Sharp) provide pre-built binaries
RUN pnpm install

# Copy the rest of the application (including prisma/schema.prisma)
COPY . .

# Generate Prisma Client (now schema file is available)
RUN pnpm prisma generate

# Expose the application port
EXPOSE 3005

# Default command (will be overridden by docker-compose)
CMD ["pnpm", "start"]
