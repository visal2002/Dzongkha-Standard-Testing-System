# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

FROM node:22-alpine AS build
WORKDIR /workspace
RUN apk upgrade --no-cache
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

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
ARG SERVICE
RUN apk upgrade --no-cache
RUN addgroup -S dzongjuk && adduser -S dzongjuk -G dzongjuk
COPY package*.json .npmrc* ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
# Only certificate rendering invokes LibreOffice. Keeping the office suite out of
# the other seven images substantially reduces their package count and attack
# surface while preserving the certificate service's DOCX-to-PDF workflow.
RUN if [ "$SERVICE" = "appeal-certificate-service" ]; then \
      apk add --no-cache libreoffice ttf-liberation; \
    fi
ENV SERVICE_NAME=${SERVICE}
COPY --from=build /workspace/dist/apps/${SERVICE} ./dist
COPY --from=build /workspace/apps/${SERVICE}/assets ./assets
RUN if [ -f /app/assets/NotoSerifTibetan-Regular.ttf ]; then mkdir -p /usr/share/fonts/truetype/noto; cp /app/assets/NotoSerifTibetan-*.ttf /usr/share/fonts/truetype/noto/; fc-cache -f; fi
RUN if [ -f /app/assets/DDC_Uchen.ttf ]; then mkdir -p /usr/share/fonts/truetype/ddc; cp /app/assets/DDC_*.ttf /usr/share/fonts/truetype/ddc/; fc-cache -f; fi
USER dzongjuk
CMD ["node", "dist/main.js"]
