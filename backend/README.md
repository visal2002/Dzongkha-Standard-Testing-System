# Dzongjuk DSTS backend

NestJS/TypeScript microservices implementation derived from the approved planning pack, BRD/TOR, and original Dzongjuk NFR.

## Service boundaries

| Service | Port | Owns |
|---|---:|---|
| Identity Access | 8001 | users, NDI boundary, sessions, roles, permissions, lockout, audit |
| Examination Registration | 8002 | exams, applications, waitlist, verification, attendance |
| Secure Assessment Content | 8003 | classified papers, timed access, sample publication |
| Evaluation Result | 8004 | committees, score versions, declaration |
| Appeal and Certification | 8005 | appeal workflow, approved revisions, certificates, QR verification |
| Notification | 8006 | in-app/email/SMS delivery and retries |
| Reporting | 8007 | projections, dashboards, governed exports, audit queries |
| Integration Gateway | 8008 | NDI, DCRC, payment, SMS and email adapters |

The services are independently buildable and deployable. Each service owns an independent PostgreSQL database; the local stack hosts those databases on one PostgreSQL server while production can place them on separate servers. Shared libraries contain transport-neutral contracts and cross-cutting platform/security code, not shared business persistence.

## Implemented production slice

- standard `/api/v1` envelope and errors, request IDs, validation, CORS, secure headers, OpenAPI, health and Prometheus endpoints;
- short-lived signed access tokens, rotating HttpOnly refresh cookies, server-side revocation and 15-minute idle enforcement;
- five-failure local-account lockout and mandatory NDI refusal for every administrative role;
- many-to-many users/roles/permissions with server-side guards;
- examination state transitions and enforced registration windows;
- duplicate application protection, serializable capacity allocation, atomic FIFO waitlist promotion and idempotent submission;
- explicit review, return, resubmit, verify and cancel commands with append-only history;
- whole-examination absence rule with all absent skills retained;
- transactional outbox publisher to RabbitMQ;
- per-document AES-256-GCM encryption with wrapped data keys, classified S3 storage, PDF and malware-scan gates, timed access and download audit;
- examination committees with exactly one head, event-projected candidate eligibility, four-skill score drafts, immutable submission versions and result declaration;
- effective-dated scoring rules that cannot affect results until explicitly approved with privileged assurance;
- effective-dated appeal fees, idempotent appeal submission, provider-neutral payment reconciliation, committee review, privileged Chief decisions, immutable history/audit and transactional appeal events;
- approved versioned certificate templates, encrypted PDF artifacts in object storage, signed QR verification, owner-only downloads, certificate history/revocation and privacy-minimal public responses;
- event-driven in-app notifications with versioned templates, idempotent RabbitMQ consumption, delivery records and owner-only read/archive APIs;
- service-owned PostgreSQL databases and migrations, Redis, RabbitMQ, MinIO, gateway, Docker, Kubernetes baseline and GitLab pipeline.

Reporting and external integrations currently have buildable service boundaries, health/OpenAPI, shared security, database isolation, gateway routing and capability contracts. Official certificate artwork/fonts, appeal-driven certificate reissue, SMS/email providers, and other external values remain tracked in [implementation status](docs/IMPLEMENTATION-STATUS.md); they are not falsely represented as production-complete.

## Local setup

1. Create `.env` from `.env.example` and replace every placeholder with locally generated values.
2. Start the platform with `docker compose up --build`.
3. Compose provisions and migrates each service-owned database before starting the APIs.
4. Use `http://localhost:8000/api/v1` as the frontend base URL.
5. Identity OpenAPI is available through the service at `http://localhost:8001/api/docs`; registration OpenAPI is at `http://localhost:8002/api/docs` when ports are exposed for local debugging.

Never enable TypeORM schema synchronization. Apply reviewed, versioned migrations through the deployment pipeline.

## Commands

```text
npm install
npm run build:all
npm test
npm run lint
npm run db:provision
docker compose config
```

## Local acceptance workflow

With the Docker Compose platform running, execute the live workflow against the gateway:

```text
npm run test:local-acceptance
```

The command registers or reuses this development-only test taker and exercises authentication, examination/application verification, attendance, eligibility projection, encrypted question-paper upload/download, committee setup, score submission, result declaration, sample publication, test-taker result retrieval, appeal payment reconciliation, no-change completion, and privileged revision approval.

```text
Email: local.acceptance@dzongjuk.test
Password: LocalTestOnly!2026
Frontend: http://localhost:5000
Gateway: http://localhost:8000
```

The acceptance script is blocked when `NODE_ENV=production`. If approved effective scoring or appeal-fee rules do not exist, it creates `LOCAL_ACCEPTANCE_V1` and `LOCAL_APPEAL_FEE_V1`; those rules and their derived local records are test-only. An approved appeal remains `APPROVED_PENDING_SCORE_UPDATE` and does not mutate a score until the official revision command and scoring rules are confirmed.

## Security constraints

- Production NDI, DCRC, payment, SMTP/SMS, object storage, secrets manager and GovTech platform values must be supplied by the Procuring Authority.
- No production secret belongs in Git, image layers, or frontend environment variables.
- Production data, backups, DR copies, logs and metadata must remain in Bhutan unless written approval says otherwise.
- Container/pod/service networks must not use `10.0.0.0/8` or `172.16.0.0/12`. Local Compose uses `192.168.240.0/24`; production CIDRs still require GovTech approval.
- Design for 12-month immutable security logging and RTO at or below 60 minutes until the NFR conflicts are formally clarified.
