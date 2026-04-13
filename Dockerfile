FROM node:25-alpine AS dependencies
WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

FROM dependencies AS development

WORKDIR /app

COPY . .

EXPOSE 9229 3000

CMD ["npm", "run", "start:dev"]

FROM dependencies AS build

WORKDIR /app

RUN npm run build

FROM node:25-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]

