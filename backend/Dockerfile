# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

FROM node:22.19.0-alpine AS build
WORKDIR /workspace
COPY package*.json nest-cli.json tsconfig*.json .npmrc* ./
RUN npm ci --ignore-scripts
COPY apps ./apps
COPY libs ./libs
ARG SERVICE
RUN npx nest build ${SERVICE}
# Not every service ships a static assets/ folder (appeal-certificate-service does -
# certificate-background.pdf and the Tibetan fonts CertificateRendererService reads
# at runtime). mkdir -p guarantees the path always exists so the unconditional COPY
# below never fails for the services that have nothing to ship.
RUN mkdir -p apps/${SERVICE}/assets

FROM node:22.19.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S dzongjuk && adduser -S dzongjuk -G dzongjuk
COPY package*.json .npmrc* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
ARG SERVICE
ENV SERVICE_NAME=${SERVICE}
COPY --from=build /workspace/dist/apps/${SERVICE} ./dist
COPY --from=build /workspace/apps/${SERVICE}/assets ./assets
USER dzongjuk
CMD ["node", "dist/main.js"]
