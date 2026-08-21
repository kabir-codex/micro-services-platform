# ---- build stage ----
# The backend URLs are inlined at build time via the VITE_* args so the
# dashboard reaches the right APIs from the cluster.
FROM node:20-alpine AS build
ARG VITE_ORDERS_API_URL=http://localhost:4000
ARG VITE_CATALOG_API_URL=http://localhost:8080
ENV VITE_ORDERS_API_URL=$VITE_ORDERS_API_URL \
    VITE_CATALOG_API_URL=$VITE_CATALOG_API_URL
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.30-alpine
RUN adduser -D -H -u 10001 appuser \
  && chown -R appuser:appuser /var/cache/nginx /var/run /var/log/nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
