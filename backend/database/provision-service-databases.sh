#!/bin/sh
# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

set -eu

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
ADMIN_DATABASE="${POSTGRES_ADMIN_DATABASE:-postgres}"

database_name() {
  case "$1" in
    identity) printf '%s' "${IDENTITY_DATABASE_NAME:-dzongjuk_identity}" ;;
    registration) printf '%s' "${REGISTRATION_DATABASE_NAME:-dzongjuk_registration}" ;;
    assessment) printf '%s' "${ASSESSMENT_DATABASE_NAME:-dzongjuk_assessment}" ;;
    result) printf '%s' "${RESULT_DATABASE_NAME:-dzongjuk_result}" ;;
    appeal_certificate) printf '%s' "${APPEAL_CERTIFICATE_DATABASE_NAME:-dzongjuk_appeal_certificate}" ;;
    notification) printf '%s' "${NOTIFICATION_DATABASE_NAME:-dzongjuk_notification}" ;;
    reporting) printf '%s' "${REPORTING_DATABASE_NAME:-dzongjuk_reporting}" ;;
    integration) printf '%s' "${INTEGRATION_DATABASE_NAME:-dzongjuk_integration}" ;;
    *) echo "Unknown database owner: $1" >&2; exit 1 ;;
  esac
}

service_flag() {
  if [ "$1" = "$2" ]; then printf 'true'; else printf 'false'; fi
}

database_exists() {
  psql --dbname "$ADMIN_DATABASE" --tuples-only --no-align --set db_name="$1" <<'SQL'
SELECT 1 FROM pg_database WHERE datname = :'db_name';
SQL
}

apply_migrations() {
  service="$1"
  database="$2"

  psql --dbname "$database" --set ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version varchar(160) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

  for migration in "$MIGRATIONS_DIR"/*.sql; do
    version="$(basename "$migration")"
    applied="$(psql --dbname "$database" --tuples-only --no-align --set version="$version" <<'SQL'
SELECT 1 FROM public.schema_migrations WHERE version = :'version';
SQL
)"
    if [ "$applied" = "1" ]; then
      continue
    fi

    echo "Applying $version to $database ($service)"
    psql --dbname "$database" --set ON_ERROR_STOP=1 --single-transaction \
      --set identity="$(service_flag "$service" identity)" \
      --set registration="$(service_flag "$service" registration)" \
      --set assessment="$(service_flag "$service" assessment)" \
      --set result="$(service_flag "$service" result)" \
      --set appeal_certificate="$(service_flag "$service" appeal_certificate)" \
      --set notification="$(service_flag "$service" notification)" \
      --set reporting="$(service_flag "$service" reporting)" \
      --set integration="$(service_flag "$service" integration)" \
      --file "$migration"

    psql --dbname "$database" --set ON_ERROR_STOP=1 --set version="$version" <<'SQL'
INSERT INTO public.schema_migrations(version) VALUES (:'version');
SQL
  done
}

for service in identity registration assessment result appeal_certificate notification reporting integration; do
  database="$(database_name "$service")"
  if [ -z "$(database_exists "$database")" ]; then
    echo "Creating service database $database"
    createdb "$database"
  fi
  apply_migrations "$service" "$database"
done

echo "All service databases are provisioned."
