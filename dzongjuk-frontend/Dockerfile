FROM node:22.19.0-alpine AS build

WORKDIR /workspace
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_USE_MOCK_DATA=false
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_USE_MOCK_DATA=${VITE_USE_MOCK_DATA}
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.staging.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/dist /usr/share/nginx/html

USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
