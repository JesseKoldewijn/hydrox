# syntax=docker/dockerfile:1
FROM node:22-bookworm AS base
ENV COREPACK_ENABLE=1
RUN corepack enable
WORKDIR /app

FROM base AS pruner
RUN npm i -g turbo@2
COPY . .
RUN turbo prune @hydrox/api --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/yarn.lock ./yarn.lock
COPY --from=pruner /app/out/full/ .
# turbo prune does not include root shared tsconfig
COPY tsconfig.base.json ./tsconfig.base.json
RUN yarn install --immutable || yarn install

FROM installer AS builder
RUN yarn turbo run build --filter=@hydrox/api...

FROM base AS runner
ENV NODE_ENV=production
ENV API_PORT=3001
WORKDIR /app
COPY --from=builder /app .
COPY docker/scripts /app/docker/scripts
RUN chmod +x /app/docker/scripts/*.sh
WORKDIR /app/apps/api
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/docker/scripts/api-entrypoint.sh"]
CMD ["node", "dist/main.js"]

FROM installer AS dev
COPY docker/scripts /app/docker/scripts
RUN chmod +x /app/docker/scripts/*.sh
ENV API_PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=8 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/docker/scripts/api-entrypoint.sh"]
CMD ["yarn", "workspace", "@hydrox/api", "dev"]
