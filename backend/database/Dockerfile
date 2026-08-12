# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

FROM postgres:17.6-alpine

COPY database/migrations /opt/dzongjuk/migrations
COPY database/provision-service-databases.sh /opt/dzongjuk/provision-service-databases.sh
COPY database/provision-service-databases.sh /docker-entrypoint-initdb.d/10-provision-service-databases.sh

RUN chmod 0555 /opt/dzongjuk/provision-service-databases.sh \
    /docker-entrypoint-initdb.d/10-provision-service-databases.sh

ENV MIGRATIONS_DIR=/opt/dzongjuk/migrations
