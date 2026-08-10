# ADR-001: Domain-oriented microservice boundaries

## Status

Accepted for implementation, pending Procuring Authority architecture approval.

## Decision

Use eight bounded-context services defined by the planning pack. Do not create one service per table. Each service owns an independent database and its internal schema, and publishes safe domain events through a transactional outbox. Cross-service dashboards use projections rather than runtime joins across service databases.

## Consequences

- Each service can be built, scaled, secured and deployed independently.
- Local development uses one PostgreSQL server with a separate logical database per service; production may move each database to an independent server without changing domain code.
- Cross-service references are stable identifiers, not database foreign keys. Database constraints never cross a service ownership boundary.
- Cross-service consistency is event-driven and requires idempotent consumers, reconciliation and dead-letter operations.
- Shared packages are limited to contracts and platform code to avoid a distributed monolith.
