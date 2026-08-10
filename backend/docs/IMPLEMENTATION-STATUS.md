# Implementation status and requirement traceability

This file distinguishes implemented code from approved architecture and unresolved external decisions. `Implemented` means working code and build evidence exist; `Foundation` means the independent service/platform boundary exists but its full workflow is not complete.

| Requirement area | Status | Evidence |
|---|---|---|
| Microservice boundaries | Implemented | eight Nest application entry points and independent images |
| API versioning/OpenAPI/error contract | Implemented | shared bootstrap, Swagger and filters |
| Authentication/session baseline | Implemented | Identity AuthService, refresh rotation, revocation, idle timeout |
| Administrative NDI enforcement | Implemented policy; external integration open | local admin login is denied; NDI credentials/spec required |
| RBAC/multi-role | Implemented | role/permission schema and global permission guard |
| ABAC | Partial | ownership and workflow checks exist; centralized resource policy catalog remains |
| Five-attempt lockout | Implemented | persistent counters and timed lock |
| Privileged MFA | External decision/open | approved NDI assurance level and MFA provider required |
| Exams/registration/waitlist | Implemented | serializable transactions, locks, constraints and outbox |
| Verification and attendance | Implemented | explicit commands, history and whole-exam absence |
| Secure question papers | Implemented; external platform confirmation open | AES-256-GCM envelope encryption, S3 storage, scan gate, timed ABAC, audit and result-gated sample publication |
| Committees/scores/results | Implemented; official formula confirmation open | committee/head constraints, eligibility events, draft/submit lock, immutable versions, approved-rule gate and declaration |
| Local end-to-end acceptance | Implemented | `npm run test:local-acceptance` exercises the live gateway, PostgreSQL, RabbitMQ, encrypted MinIO, appeals, certificate PDF/QR/ownership, and notification projection; fallback scoring, fee and certificate templates are test-only |
| Appeals/payments | Core workflow implemented; provider adapter open | effective-dated approved fee rules, idempotent ownership-safe submission, exact internal-key payment confirmation, committee assignment enforcement, no-change completion, privileged Chief decision, history/audit/outbox; approved revisions remain pending Result-service application |
| Certificates | Core workflow implemented; official template/reissue policy open | approved versioned templates, internal published-result/profile contracts, encrypted PDF storage, signed QR token, owner-only access, minimal public verification, history, revocation, audit and outbox |
| Notifications | In-app workflow implemented; provider adapters open | versioned approved templates, idempotent RabbitMQ projection, delivery records, owner list/read/read-all/archive APIs; SMS/email credentials and retry workers remain |
| Reports/audit viewer | Foundation | projections/export workers remain |
| Integration adapters | Foundation | official NDI/DCRC/payment/SMS/email specifications remain |
| Service-owned PostgreSQL databases | Implemented through certificates/notifications | eight independently provisioned logical databases; additive migrations `0001` through `0004` execute only for their owning service and are tracked per database |
| Redis/RabbitMQ/object storage | Implemented development topology | Compose platform and registration outbox publisher |
| Docker/GitLab/Kubernetes | Baseline implemented | non-root image, CI pipeline, probes, HPA, PDB, network policy |
| Observability | Partial | request IDs, health and Prometheus runtime metrics; OpenTelemetry collector/tracing remains |
| Backup/DR/VAPT/load evidence | Not yet accepted | requires target GovTech infrastructure and formal test execution |

## Decisions requiring written approval

1. Peak concurrency: NFR text contains `[1,00]`; confirm 100 or 1,000.
2. Log retention: main requirement says 12 months while Appendix V says 90 days; current design uses 12 months.
3. Recovery: MTTR says 2 hours while RTO says 60 minutes; current design uses the stricter 60 minutes.
4. Numeric RPO is missing.
5. Canonical Chief role and VERIFIED versus APPROVED state semantics.
6. Official score range, rounding, overall formula and CEFR/band mapping.
7. NDI protocol, claims, assurance level, sandbox and administrative-role classification.
8. DCRC/census, payment, SMS and email provider contracts.
9. Certificate public fields, template/signature controls and post-appeal reissue rule.
10. GovTech registry, Kubernetes, service mesh, secrets/KMS, storage, backup and approved CIDRs.

These decisions cannot be safely invented in code. Adapters and boundaries isolate them so implementation can continue without rewriting completed domains.
