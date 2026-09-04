# External confirmation register

Production remains fail-closed until the following values are approved in writing. This register is the handoff checklist for DCDD and GovTech; it does not substitute proposed values for authoritative decisions.

## Scoring formula

Status: `AWAITING DCDD APPROVAL`

Required confirmation:

| Field | Required decision |
|---|---|
| Numeric score range | minimum and maximum per skill |
| Increment | permitted score step, for example whole or half points |
| Aggregation | approved overall-score formula |
| Rounding | decimal precision and tie-breaking rule |
| Bands | complete non-overlapping overall-score ranges and labels |
| CEFR | approved CEFR value for each band, if applicable |
| Effective period | start/end date and treatment of older examinations |
| Approval authority | named role/person allowed to activate a rule |

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
