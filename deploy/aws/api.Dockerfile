FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json .npmrc ./
COPY packages/api/package.json packages/api/
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/mcp-server/package.json packages/mcp-server/
RUN npm ci -w packages/api
COPY packages/api packages/api
RUN npm run build -w packages/api

FROM node:22-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json ./
WORKDIR /app/packages/api
COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/packages/api/build build
COPY --from=builder /app/packages/api/resources resources
COPY --from=builder /app/packages/api/.sequelizerc ./
COPY packages/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p logs
EXPOSE 8000
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "build/server.js"]
