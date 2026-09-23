# syntax=docker/dockerfile:1

# Build stage: install every dependency and compile TypeScript to dist/

FROM node:24-alpine AS build
WORKDIR /app

# Copy manifests first so the dependency layer is cached until they change
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build


# Runtime stage: production dependencies and compiled output only

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
 && npm cache clean --force \
 && rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /opt/yarn-v*

COPY --from=build /app/dist ./dist

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} \
    PORT=3000

# Run as the unprivileged user the official Node image provides
USER node

EXPOSE 3000

# Exec form, using Node's built-in fetch: no shell or curl needed in the image
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "dist/index.js"]