# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

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
RUN rm /etc/nginx/conf.d/default.conf \
    && mkdir -p /tmp/nginx/client-body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
    && chown -R nginx:nginx /tmp/nginx
COPY nginx.production.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
