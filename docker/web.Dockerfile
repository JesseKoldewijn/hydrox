# syntax=docker/dockerfile:1
FROM node:22-bookworm AS base
RUN corepack enable
WORKDIR /app

FROM base AS pruner
RUN npm i -g turbo@2
COPY . .
RUN turbo prune @hydrox/web --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/yarn.lock ./yarn.lock
COPY --from=pruner /app/out/full/ .
RUN yarn install --immutable || yarn install

FROM installer AS builder
RUN yarn turbo run build --filter=@hydrox/web...

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM installer AS dev
CMD ["yarn", "workspace", "@hydrox/web", "dev", "--host", "0.0.0.0"]
