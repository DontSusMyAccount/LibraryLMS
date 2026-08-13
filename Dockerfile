FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

FROM base AS web
EXPOSE 3000
CMD ["bun", "run", "dev:web"]

FROM base AS server
EXPOSE 3001
CMD ["bun", "run", "api:dev"]
