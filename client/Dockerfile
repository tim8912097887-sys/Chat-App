FROM node:22-alpine AS base
# Setting Pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Pnpm automatically uses the mounted path
ENV PNPM_CONFIG_STORE_DIR="/pnpm/store"
RUN corepack enable

FROM base AS dev_dep
WORKDIR /app
# Enhance build speed by cache
COPY package.json pnpm-lock.yaml ./
# Use cache mount enhance install speed
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS pro_dep
WORKDIR /app
# Enhance build speed by cache
COPY package.json pnpm-lock.yaml ./
# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM dev_dep AS build
WORKDIR /app
COPY . .
RUN pnpm build

# Final stage
FROM nginx:stable-alpine
WORKDIR /app

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]