# Stage 1: Base dependencies and build tools
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Stage 2: Development target - for local development with hot reload
FROM dependencies AS development

WORKDIR /app

# Copy entire source code
COPY . .

# Expose debug port and application port
EXPOSE 9229 3000

# Run with ts-node for development (hot reload)
CMD ["npm", "run", "start:dev"]

# Stage 3: Build stage - compile TypeScript
FROM dependencies AS build

WORKDIR /app

COPY . .

# Build the application
RUN npm run build

# Stage 4: Production target - minimal runtime image
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies in a fresh image
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy compiled application from build stage
COPY --from=build /app/dist ./dist

# Expose application port only (no debug port in production)
EXPOSE 3000

# Run the compiled application
CMD ["node", "dist/main.js"]