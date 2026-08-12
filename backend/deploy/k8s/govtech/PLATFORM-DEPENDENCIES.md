# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

# Production dependencies and NFR controls

The supplied vendor package confirms the private cluster, namespace `dzongjuk`, Harbor registry, and `openebs-rwx` dynamic storage. It does not confirm all values required for a secure public production launch.

## Required before public go-live

| Owner | Required value or service | Current deployment behavior |
|---|---|---|
| GovTech | Private network or VPN route to the Kubernetes API and Harbor | Deployment stops before making changes when connectivity fails. |
| GovTech | Confirmed Harbor project/repository path | Script defaults to project `dzongjuk` and supports `-RegistryProject`. |
| GovTech | Ingress class/controller, official DNS record, and TLS certificate process | Hostless ingress is created; official HTTPS URL is required by the script. |
| GovTech | RBAC permission for Services and Ingress | Script checks permissions before deployment. |
| GovTech | Backup target, retention, encryption, restore RTO/RPO, and restore-test schedule | Persistent storage is configured; backups are not guessed or silently enabled. |
| GovTech | Approved monitoring/logging endpoints and alert routing | Services expose health and Prometheus metrics; cluster integration is pending. |
| GovTech | Permission for HPA, PodDisruptionBudget, NetworkPolicy, and backup CronJobs | Initial package uses two replicas and resource limits; these NFR controls require confirmed cluster permissions. |
| DCDD/NDI | NDI authorization/token/user-info endpoints, client ID, redirect URI, credentials, assurance mapping, and logout contract | No credentials are embedded. NDI login remains unavailable until the official contract is supplied. |
| DCDD | Official scoring formula and approval authority | Scoring-rule approval remains mandatory; formula confirmation is intentionally deferred. |
| DCDD/GovTech | SMTP or government notification gateway values | Notification records work; outbound email cannot be enabled without an approved provider. |
| DCDD/GovTech | Malware-scanning endpoint and fail-closed policy | Scanner integration exists. `MALWARE_SCAN_REQUIRED` is temporarily false so question-paper workflows can be acceptance-tested. |
| DCDD | Data classification, retention, archival, and feature-removal approval | Databases are independently owned; deletion still requires an approved retention decision. |

## Database ownership

The production PostgreSQL image creates and migrates these databases independently:

- `dzongjuk_identity`
- `dzongjuk_registration`
- `dzongjuk_assessment`
- `dzongjuk_result`
- `dzongjuk_appeal_certificate`
- `dzongjuk_notification`
- `dzongjuk_reporting`
- `dzongjuk_integration`

Removing a feature means stopping its service and event consumers, exporting or disposing its records according to retention policy, and dropping only its database. Cross-service identifiers are not enforced as database foreign keys.

## Recommended hardening after permissions are confirmed

1. Enable TLS at ingress and redirect all HTTP traffic to HTTPS.
2. Add default-deny NetworkPolicies with explicit DNS, database, message broker, object storage, NDI, SMTP, and observability egress.
3. Add HPAs and PodDisruptionBudgets for stateless services after resource quotas and metrics-server availability are known.
4. Configure encrypted scheduled backups and complete a measured restore exercise.
5. Enable fail-closed malware scanning before accepting production question-paper uploads.
6. Send audit and security logs to the approved immutable logging platform with alerting.
