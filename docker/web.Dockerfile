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
# turbo prune does not include root shared tsconfig
COPY tsconfig.base.json ./tsconfig.base.json
RUN yarn install --immutable || yarn install

FROM installer AS builder
RUN yarn turbo run build --filter=@hydrox/web...

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]

FROM installer AS dev
ENV PORT=5173
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=8 \
  CMD node -e "fetch('http://127.0.0.1:5173/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["yarn", "workspace", "@hydrox/web", "dev", "--host", "0.0.0.0", "--port", "5173"]
