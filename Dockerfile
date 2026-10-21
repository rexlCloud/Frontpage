# Build: fetches the newest cloud release and its Javadoc from repo.rexlcloud.de, then builds the static site
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Changes on every deploy, so a new cloud release is fetched even when the sources did not change
ARG CACHE_BUST=0
ENV FETCH_STRICT=1 ASTRO_TELEMETRY_DISABLED=1
RUN echo "build $CACHE_BUST" && npm run build

FROM nginx:1-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
