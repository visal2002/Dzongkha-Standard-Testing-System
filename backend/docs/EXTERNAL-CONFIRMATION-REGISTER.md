# External confirmation register

Production remains fail-closed until the following values are approved in writing. This register is the handoff checklist for DCDD and GovTech; it does not substitute proposed values for authoritative decisions.

## Scoring formula

Status: `CONFIRMED FOR IMPLEMENTATION ON 2026-08-28`

The project owner supplied the DSTS Total Score to Standard table for implementation. Each skill total is converted independently and the four resulting standards are averaged for the published overall standard.

| Total score | DSTS Standard |
|---:|---:|
| 50 | 10 |
| 48–49.5 | 9 |
| 45–47.5 | 8 |
| 41–44.5 | 7 |
| 34–40.5 | 6 |
| 27–33.5 | 5 |
| 20–26.5 | 4 |
| 13–19.5 | 3 |
| 6–12.5 | 2 |
| 1–5.5 | 1 |

Implemented decisions:

| Field | Required decision |
|---|---|
| Numeric score range | 1–50 per skill |
| Increment | 0.5 |
| Aggregation | Convert each skill total to Standard 1–10, then calculate the arithmetic mean of the four standards |
| Rounding | 2 decimal places |
| Bands | As listed above |
| CEFR | Not part of the supplied standard |
| Effective period | Effective for new submissions after migration; older results retain their original rule |
| Approval authority | Existing privileged `score.rule.manage` approval control |

Implementation gate: scoring rules are created as `DRAFT`. `POST /api/v1/scoring-rules/{id}/approve` requires `score.rule.manage` and an assurance level listed in `PRIVILEGED_ASSURANCE_LEVELS`. Score submission and result declaration return `SCORING_RULE_NOT_APPROVED` until an effective rule is approved.

## NDI contract

Status: `AWAITING GOVTECH/NDI SPECIFICATION AND SANDBOX`

Required confirmation:

| Field | Required value/evidence |
|---|---|
| Protocol/profile | approved OAuth2/OIDC/NDI protocol document and version |
| Endpoints | authorization, token, user-info/claims and logout endpoints |
| Client identity | client ID and secret/key reference |
| Redirects | approved staging, UAT and production callback URLs |
| Claims | stable subject/CID claim, name claims and assurance claim |
| Security | state, nonce, PKCE, signing algorithms, issuer and audience requirements |
| Assurance | whether NDI satisfies privileged MFA and at what assurance value |
| Lifecycle | account linking, de-linking, disabled identity and session logout behavior |
| Operations | timeout, rate limit, outage/fallback and support contacts |

Implementation gate: administrative local-password login is denied. No production bypass or mock NDI callback is provided. `PRIVILEGED_ASSURANCE_LEVELS` defaults to `MFA`, so scoring-rule approval and result declaration remain blocked until the NDI assurance decision is signed.

## GovTech infrastructure

Status: `AWAITING GOVTECH PLATFORM VALUES`

Required confirmation:

| Area | Required value/evidence |
|---|---|
| Kubernetes | version, namespaces, quotas, ingress/gateway and registry |
| Networking | approved pod/service CIDRs excluding `10.0.0.0/8` and `172.16.0.0/12` |
| Service mesh | approved Istio/Linkerd version and mTLS policy |
| Secrets/KMS | secrets manager, key wrapping/rotation API and access policy |
| Object storage | Bhutan-hosted S3 endpoint, bucket, retention, versioning and backup |
| Malware scanning | service endpoint, response contract, limits and SLA |
| PostgreSQL | HA endpoint, TLS CA, pooling, backup, PITR and maintenance window |
| RabbitMQ | HA endpoint, TLS CA, credentials, quorum/DLQ policy and monitoring |
| Observability | in-country logs, metrics, traces, retention and alert destinations |
| DR | numeric RPO, approved RTO, DR site and restore-test schedule |
| Data residency | written confirmation that data and metadata remain in Bhutan |

Implementation gate: production Assessment startup fails when its 256-bit master key or classified object-storage bucket is unavailable. Kubernetes manifests reference `dzongjuk-secrets`; no real infrastructure credential is committed.
