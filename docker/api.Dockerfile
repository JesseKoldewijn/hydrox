# syntax=docker/dockerfile:1
FROM node:22-bookworm AS base
ENV COREPACK_ENABLE=1
RUN corepack enable
WORKDIR /app

FROM base AS installer
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY tsconfig.base.json ./tsconfig.base.json
COPY turbo.json ./turbo.json
COPY apps ./apps
COPY packages ./packages
RUN yarn install --immutable || yarn install

FROM installer AS builder
ENV NODE_ENV=production
RUN yarn turbo run build --filter=@hydrox/web --filter=@hydrox/api...

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV API_PORT=3000
WORKDIR /app
COPY --from=builder /app .
COPY docker/scripts /app/docker/scripts
RUN chmod +x /app/docker/scripts/*.sh
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||process.env.API_PORT||3000)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/docker/scripts/api-entrypoint.sh"]
CMD ["node", "dist/main.js"]

FROM installer AS dev
COPY docker/scripts /app/docker/scripts
RUN chmod +x /app/docker/scripts/*.sh
ENV PORT=3000
ENV API_PORT=3000
ENV NODE_ENV=development
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=8 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||process.env.API_PORT||3000)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/docker/scripts/api-entrypoint.sh"]
CMD ["yarn", "workspace", "@hydrox/api", "dev"]
