# syntax=docker/dockerfile:1
FROM node:22-bookworm AS base
COREPACK_ENABLE=1
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
RUN yarn install --immutable || yarn install

FROM installer AS builder
RUN yarn turbo run build --filter=@hydrox/api...

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app .
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM installer AS dev
CMD ["yarn", "workspace", "@hydrox/api", "dev"]
