# ============================================================
# Frontend Valdocco: build con Vite, servido por nginx.
# nginx hace proxy de /api hacia el gateway (misma-origen → cookies seguras).
# ============================================================
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter @valdocco/web... \
  && pnpm --filter @valdocco/web build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
