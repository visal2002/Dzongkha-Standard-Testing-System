# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

# GovTech Kubernetes deployment

This package deploys Dzongjuk into the assigned `dzongjuk` namespace. It does not store kubeconfig data, Harbor credentials, application secrets, or generated manifests in Git.

## Deployed architecture

- Production React frontend with real API mode and same-origin `/api/v1` routing
- Unprivileged Nginx API gateway
- Identity, registration, assessment content, result, appeal/certificate, notification, reporting, and integration microservices
- One PostgreSQL server with eight independently owned logical databases
- Redis, RabbitMQ, and MinIO platform services
- Four persistent volumes using the vendor-provided `openebs-rwx` storage class and `ReadWriteMany` access
- Two replicas for each stateless application component
- Readiness/liveness probes, resource limits, non-root application containers, dropped Linux capabilities, and read-only root filesystems

Each service can use a dedicated PostgreSQL server later through its prefixed `*_DATABASE_HOST`, `*_DATABASE_PORT`, `*_DATABASE_USER`, and `*_DATABASE_PASSWORD` settings. No service shares a schema or database with another service.

## Prerequisites

1. Connect this computer to the GovTech private network or approved VPN.
2. Confirm `kubectl`, Docker Desktop, and Git are installed.
3. Confirm the kubeconfig still has access to namespace `dzongjuk`.
4. Confirm the Harbor project is named `dzongjuk`, or pass its actual project name with `-RegistryProject`.
5. Obtain the official HTTPS application URL. The script will not accept an insecure production URL.
6. If private DNS cannot resolve Harbor, add the vendor-provided Harbor IP mapping to the local hosts file with administrator approval.

Do not copy the vendor kubeconfig over a personal `~/.kube/config`. Pass it directly to the script so other Kubernetes contexts remain untouched.

## Deploy

Run PowerShell from the repository root:

```powershell
.\backend\scripts\deploy-govtech.ps1 `
  -Kubeconfig 'F:\path\to\jordhen-dzongjuk-kubeconfig.yaml' `
  -RegistryCredentialsFile 'F:\path\to\mail-details.txt' `
  -PublicApiBaseUrl 'https://official-dzongjuk-domain.gov.bt/api/v1'
```

The script performs these operations in order:

1. Verifies cluster connectivity, namespace, and required RBAC permissions.
2. Logs in to Harbor without placing its password on the command line.
3. Creates or updates the Kubernetes image-pull secret.
4. Creates strong random application secrets only when they do not already exist.
5. Builds and pushes immutable images tagged with the current Git commit.
6. Mirrors PostgreSQL, Redis, RabbitMQ, and MinIO images into Harbor.
7. Deploys persistent platform services and waits for PostgreSQL.
8. Applies all forward-only migrations to the eight owned databases.
9. Deploys all APIs, the gateway, frontend, and ingress, then verifies every rollout.

Use `-SkipBuild` only when every commit-tagged application image already exists locally. Use `-SkipPush` only for manifest testing when every required image already exists in Harbor.

## Verify

```powershell
$kube = 'F:\path\to\jordhen-dzongjuk-kubeconfig.yaml'
kubectl --kubeconfig $kube -n dzongjuk get pods,services,ingress
kubectl --kubeconfig $kube -n dzongjuk get events --sort-by=.lastTimestamp
kubectl --kubeconfig $kube -n dzongjuk logs deployment/api-gateway --tail=100
kubectl --kubeconfig $kube -n dzongjuk port-forward service/frontend 8080:80
```

With the port forward running, open `http://localhost:8080/health`, then `http://localhost:8080/`. The frontend proxies API calls to the in-cluster gateway.

## Roll back

Images use Git commit tags, so rollback does not depend on mutable `latest` tags:

```powershell
$kube = 'F:\path\to\jordhen-dzongjuk-kubeconfig.yaml'
kubectl --kubeconfig $kube -n dzongjuk rollout undo deployment/frontend
kubectl --kubeconfig $kube -n dzongjuk rollout undo deployment/identity-service
```

Database migrations are forward-only. Restore PostgreSQL from an approved backup instead of attempting an unreviewed schema rollback.

## Security rules

- Never commit the supplied kubeconfig or vendor credential file.
- Never add production secrets to a YAML file, `.env` file, CI variable in plain text, or issue/PR comment.
- Back up the `dzongjuk-secrets` values through the approved secret-management process before disaster recovery is required.
- Do not expose PostgreSQL, Redis, RabbitMQ management, or MinIO console services through ingress.
- Do not create production test users or reuse local acceptance credentials.

See `PLATFORM-DEPENDENCIES.md` for values and controls that must be confirmed with GovTech and DCDD before public go-live.
