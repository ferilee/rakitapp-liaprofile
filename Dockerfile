FROM oven/bun:1.2.21 AS build

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build

FROM oven/bun:1.2.21 AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock* ./
RUN bun install --production --frozen-lockfile || bun install --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["bun", "run", "src/server/index.ts"]
