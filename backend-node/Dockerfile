FROM node:26-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:26-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
USER app
ENV NODE_ENV=production
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"
CMD ["node", "src/index.js"]
