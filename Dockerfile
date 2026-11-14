# syntax=docker/dockerfile:1

# --- Build: TypeScript → dist/ -------------------------------------------------
FROM node:26.13.1-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- Nur Laufzeit-Abhängigkeiten -------------------------------------------------
FROM node:26.13.1-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

# --- Laufzeit-Image --------------------------------------------------------------
FROM node:26.13.1-alpine3.24
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/healthz`).then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/server.js"]
