# Service-owned databases

Every microservice owns an independent PostgreSQL database. The local Docker stack uses one PostgreSQL server to reduce developer resource usage, but it creates eight logical databases:

| Service owner | Default database | Owned schema |
|---|---|---|
| Identity | `dzongjuk_identity` | `identity` |
| Registration | `dzongjuk_registration` | `registration` |
| Assessment content | `dzongjuk_assessment` | `assessment` |
| Results | `dzongjuk_result` | `result` |
| Appeals and certificates | `dzongjuk_appeal_certificate` | `appeal_certificate` |
| Notifications | `dzongjuk_notification` | `notification` |
| Reporting | `dzongjuk_reporting` | `reporting` |
| Integration | `dzongjuk_integration` | `integration` |

`provision-service-databases.sh` creates missing databases and applies each forward-only migration only to its owning database. Applied versions are recorded independently in `public.schema_migrations`. Docker Compose runs this provisioner before any application service starts; it can also be run explicitly with `npm run db:provision`.

Cross-service identifiers such as `examId`, `applicationId`, and `userId` are intentionally not database foreign keys. Their validity is established through versioned service APIs or idempotent domain-event projections. Foreign keys remain mandatory within a service-owned database.

Removing a feature requires stopping its service and consumers, preserving or disposing data according to the approved retention policy, and then dropping only its owned database. Never cascade deletion into another service database.

Production may place each logical database on a separate PostgreSQL server. Every service supports prefixed connection overrides such as `RESULT_DATABASE_HOST`, `RESULT_DATABASE_USER`, and `RESULT_DATABASE_PASSWORD`, while common `DATABASE_*` values remain local-development fallbacks.

Never enable TypeORM `synchronize`. Apply reviewed, versioned migrations through the deployment pipeline.
