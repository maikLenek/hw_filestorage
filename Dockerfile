# ─── Base stage ───────────────────────────────────────────────────────────────
FROM node:25-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─── Development stage ────────────────────────────────────────────────────────
FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# ─── Build stage ──────────────────────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ─── Production stage (default target) ────────────────────────────────────────
FROM node:25-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/src/main.js"]
