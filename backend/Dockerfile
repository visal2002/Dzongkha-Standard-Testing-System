# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

FROM node:22.19.0-alpine AS build
WORKDIR /workspace
COPY package*.json nest-cli.json tsconfig*.json ./
RUN npm ci --ignore-scripts
COPY apps ./apps
COPY libs ./libs
ARG SERVICE
RUN npx nest build ${SERVICE}

FROM node:22.19.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S dzongjuk && adduser -S dzongjuk -G dzongjuk
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
ARG SERVICE
ENV SERVICE_NAME=${SERVICE}
COPY --from=build /workspace/dist/apps/${SERVICE} ./dist
USER dzongjuk
CMD ["node", "dist/main.js"]
