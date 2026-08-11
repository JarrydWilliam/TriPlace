# Base image
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package*.json ./
RUN npm ci

# Build the application
FROM dependencies AS build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY --from=build /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules

USER node
EXPOSE 5000

CMD ["node", "dist/index.js"]
