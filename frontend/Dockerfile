# syntax=docker/dockerfile:1


# Build stage: type-check, then produce the static bundle in dist/

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# Runtime stage: nginx serves the bundle and proxies /api to the server.

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

USER root
RUN apk upgrade --no-cache
USER nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]