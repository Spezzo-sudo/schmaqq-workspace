FROM node:24-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY studio ./studio
COPY app ./app
COPY public ./public
RUN npx vite build --config studio/vite.config.ts

FROM node:24-alpine
ENV NODE_ENV=production STUDIO_BIND=0.0.0.0
WORKDIR /app
COPY --from=build /build/studio-dist ./studio-dist
COPY --from=build /build/node_modules/zod ./node_modules/zod
COPY --from=build /build/node_modules/jose ./node_modules/jose
COPY selfhost ./selfhost
COPY package.json ./package.json
RUN mkdir -p /app/.studio && chown -R node:node /app
USER node
EXPOSE 4310 4311
CMD ["node","selfhost/server.mjs"]
