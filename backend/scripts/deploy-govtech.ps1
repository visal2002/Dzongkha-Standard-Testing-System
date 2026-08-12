# Email: ambhutan@gmail.com | hello@aakash-pradhan.com
# Website: ambhutan.com | aakash-pradhan.com
# Phone: +975 - 1750 - 5267

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$Kubeconfig,

    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$RegistryCredentialsFile,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$PublicApiBaseUrl,

    [string]$Registry = 'dev-harbor.systems.gov.bt',
    [string]$RegistryProject = 'dzongjuk',
    [string]$Namespace = 'dzongjuk',
    [string]$ImageTag,
    [switch]$SkipBuild,
    [switch]$SkipPush
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$kubeconfigPath = (Resolve-Path -LiteralPath $Kubeconfig).Path
$credentialsPath = (Resolve-Path -LiteralPath $RegistryCredentialsFile).Path
$registryRoot = "$Registry/$RegistryProject"

if (-not $ImageTag) {
    $ImageTag = (& git -C $repoRoot rev-parse --short=12 HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $ImageTag) {
        throw 'Unable to derive an image tag from the current Git commit.'
    }
}
if ($ImageTag -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$') {
    throw "Invalid container image tag: $ImageTag"
}

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE."
    }
}

function New-RandomHex {
    param([int]$Bytes = 32)
    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($buffer) -replace '-', '').ToLowerInvariant()
}

function New-RandomBase64 {
    $buffer = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($buffer)
}

function Get-RenderedManifest {
    param([string]$Directory)
    $manifest = (& kubectl kustomize $Directory) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "Unable to render $Directory." }
    $origin = ([Uri]$PublicApiBaseUrl).GetLeftPart([System.UriPartial]::Authority)
    return $manifest.Replace('dev-harbor.systems.gov.bt/dzongjuk', $registryRoot).
        Replace(':deployment-tag', ":$ImageTag").
        Replace('https://replace-with-official-domain.example/api/v1', $PublicApiBaseUrl.TrimEnd('/')).
        Replace('https://replace-with-official-domain.example', $origin)
}

function Apply-ManifestText {
    param([string]$Manifest)
    $Manifest | & kubectl --kubeconfig $kubeconfigPath -n $Namespace apply -f -
    if ($LASTEXITCODE -ne 0) { throw 'Kubernetes manifest apply failed.' }
}

Write-Host "Checking Kubernetes access for namespace '$Namespace'..."
Invoke-Checked kubectl @('--kubeconfig', $kubeconfigPath, '--request-timeout=15s', 'version')
$configuredNamespace = (& kubectl --kubeconfig $kubeconfigPath config view --minify -o 'jsonpath={..namespace}').Trim()
if ($LASTEXITCODE -ne 0) { throw 'Unable to read the kubeconfig context.' }
if ($configuredNamespace -and $configuredNamespace -ne $Namespace) {
    throw "The kubeconfig namespace is '$configuredNamespace', not '$Namespace'."
}

$requiredPermissions = @(
    @('create', 'deployments.apps'), @('create', 'services'), @('create', 'secrets'),
    @('create', 'configmaps'), @('create', 'persistentvolumeclaims'), @('create', 'pods'),
    @('create', 'serviceaccounts'), @('create', 'ingresses.networking.k8s.io')
)
foreach ($permission in $requiredPermissions) {
    $allowed = (& kubectl --kubeconfig $kubeconfigPath -n $Namespace auth can-i $permission[0] $permission[1]).Trim()
    if ($allowed -ne 'yes') {
        throw "Cluster access does not allow '$($permission[0]) $($permission[1])' in namespace '$Namespace'."
    }
}

$credentialText = Get-Content -LiteralPath $credentialsPath -Raw
$userMatch = [regex]::Match($credentialText, '(?im)^\s*User\s*:\s*(.+?)\s*$')
$passwordMatch = [regex]::Match($credentialText, '(?im)^\s*Password\s*:\s*(.+?)\s*$')
if (-not $userMatch.Success -or -not $passwordMatch.Success) {
    throw 'The registry credentials file must contain User: and Password: lines.'
}
$registryUser = $userMatch.Groups[1].Value.Trim()
$registryPassword = $passwordMatch.Groups[1].Value.Trim()

$tempDirectory = Join-Path ([IO.Path]::GetTempPath()) ("dzongjuk-deploy-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $tempDirectory | Out-Null
try {
    $dockerConfigDirectory = Join-Path $tempDirectory 'docker'
    New-Item -ItemType Directory -Path $dockerConfigDirectory | Out-Null
    $env:DOCKER_CONFIG = $dockerConfigDirectory

    Write-Host "Authenticating to Harbor at $Registry..."
    $registryPassword | & docker login $Registry --username $registryUser --password-stdin
    if ($LASTEXITCODE -ne 0) { throw 'Harbor login failed.' }

    $auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${registryUser}:${registryPassword}"))
    $dockerConfig = @{ auths = @{ $Registry = @{ auth = $auth } } } | ConvertTo-Json -Depth 5 -Compress
    $pullConfigPath = Join-Path $tempDirectory 'config.json'
    [IO.File]::WriteAllText($pullConfigPath, $dockerConfig, (New-Object Text.UTF8Encoding $false))
    & kubectl --kubeconfig $kubeconfigPath -n $Namespace create secret generic harbor-registry `
        --type=kubernetes.io/dockerconfigjson --from-file=".dockerconfigjson=$pullConfigPath" `
        --dry-run=client -o yaml | & kubectl --kubeconfig $kubeconfigPath -n $Namespace apply -f -
    if ($LASTEXITCODE -ne 0) { throw 'Unable to create the Harbor image-pull secret.' }

    & kubectl --kubeconfig $kubeconfigPath -n $Namespace get secret dzongjuk-secrets *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Creating the application secret set...'
        $databasePassword = New-RandomHex 32
        $redisPassword = New-RandomHex 24
        $rabbitPassword = New-RandomHex 24
        $s3AccessKey = 'dz' + (New-RandomHex 10)
        $s3SecretKey = New-RandomHex 32
        $secretPath = Join-Path $tempDirectory 'application.env'
        $secretLines = @(
            'DATABASE_USER=dzongjuk', "DATABASE_PASSWORD=$databasePassword",
            "JWT_SECRET=$(New-RandomHex 48)", "INTERNAL_SERVICE_SECRET=$(New-RandomHex 48)",
            "REDIS_PASSWORD=$redisPassword", "REDIS_URL=redis://default:${redisPassword}@redis:6379",
            'RABBITMQ_USER=dzongjuk', "RABBITMQ_PASSWORD=$rabbitPassword",
            "RABBITMQ_URL=amqp://dzongjuk:${rabbitPassword}@rabbitmq:5672",
            "S3_ACCESS_KEY=$s3AccessKey", "S3_SECRET_KEY=$s3SecretKey",
            "ASSESSMENT_MASTER_KEY_BASE64=$(New-RandomBase64)",
            "CERTIFICATE_MASTER_KEY_BASE64=$(New-RandomBase64)",
            "CERTIFICATE_VERIFICATION_SECRET=$(New-RandomHex 48)"
        )
        [IO.File]::WriteAllLines($secretPath, $secretLines, (New-Object Text.UTF8Encoding $false))
        Invoke-Checked kubectl @('--kubeconfig', $kubeconfigPath, '-n', $Namespace, 'create', 'secret', 'generic', 'dzongjuk-secrets', "--from-env-file=$secretPath")
    } else {
        Write-Host 'Preserving the existing application secrets.'
    }

    $applicationServices = @(
        'identity-service', 'registration-service', 'assessment-content-service', 'result-service',
        'appeal-certificate-service', 'notification-service', 'reporting-service', 'integration-service'
    )
    $versionedImages = @($applicationServices + @('postgres', 'api-gateway', 'frontend'))
    $publicImages = @{
        redis = 'redis:8.2-alpine'
        rabbitmq = 'rabbitmq:4.1-management-alpine'
        minio = 'minio/minio:RELEASE.2025-07-23T15-54-02Z'
    }

    if (-not $SkipBuild) {
        foreach ($service in $applicationServices) {
            Write-Host "Building $service..."
            Invoke-Checked docker @('build', '--build-arg', "SERVICE=$service", '-f', (Join-Path $repoRoot 'backend\Dockerfile'), '-t', "$registryRoot/${service}:$ImageTag", (Join-Path $repoRoot 'backend'))
        }
        Invoke-Checked docker @('build', '-f', (Join-Path $repoRoot 'backend\database\Dockerfile'), '-t', "$registryRoot/postgres:$ImageTag", (Join-Path $repoRoot 'backend'))
        Invoke-Checked docker @('build', '-f', (Join-Path $repoRoot 'backend\deploy\docker\Dockerfile.gateway'), '-t', "$registryRoot/api-gateway:$ImageTag", (Join-Path $repoRoot 'backend'))
        Invoke-Checked docker @('build', '--build-arg', 'VITE_API_BASE_URL=/api/v1', '--build-arg', 'VITE_USE_MOCK_DATA=false', '-t', "$registryRoot/frontend:$ImageTag", (Join-Path $repoRoot 'dzongjuk-frontend'))
    }

    if (-not $SkipPush) {
        foreach ($image in $versionedImages) {
            Invoke-Checked docker @('push', "$registryRoot/${image}:$ImageTag")
        }
        foreach ($entry in $publicImages.GetEnumerator()) {
            Invoke-Checked docker @('pull', $entry.Value)
            $sourceTag = ($entry.Value -split ':', 2)[1]
            Invoke-Checked docker @('tag', $entry.Value, "$registryRoot/$($entry.Key):$sourceTag")
            Invoke-Checked docker @('push', "$registryRoot/$($entry.Key):$sourceTag")
        }
    }

    Write-Host 'Deploying stateful platform services...'
    Apply-ManifestText (Get-RenderedManifest (Join-Path $repoRoot 'backend\deploy\k8s\govtech\platform'))
    Invoke-Checked kubectl @('--kubeconfig', $kubeconfigPath, '-n', $Namespace, 'rollout', 'status', 'deployment/postgres', '--timeout=300s')

    & kubectl --kubeconfig $kubeconfigPath -n $Namespace delete pod database-migrator --ignore-not-found=true
    if ($LASTEXITCODE -ne 0) { throw 'Unable to clear the previous migration pod.' }
    $migration = Get-Content (Join-Path $repoRoot 'backend\deploy\k8s\govtech\migration.yaml') -Raw
    $migration = $migration.Replace('dev-harbor.systems.gov.bt/dzongjuk', $registryRoot).Replace(':deployment-tag', ":$ImageTag")
    Apply-ManifestText $migration
    Invoke-Checked kubectl @('--kubeconfig', $kubeconfigPath, '-n', $Namespace, 'wait', '--for=jsonpath={.status.phase}=Succeeded', 'pod/database-migrator', '--timeout=300s')

    Write-Host 'Deploying application services and frontend...'
    Apply-ManifestText (Get-RenderedManifest (Join-Path $repoRoot 'backend\deploy\k8s\govtech\apps'))
    foreach ($deployment in @($applicationServices + @('api-gateway', 'frontend'))) {
        Invoke-Checked kubectl @('--kubeconfig', $kubeconfigPath, '-n', $Namespace, 'rollout', 'status', "deployment/$deployment", '--timeout=300s')
    }

    Write-Host "Deployment complete. Image tag: $ImageTag"
    Invoke-Checked kubectl @('--kubeconfig', $kubeconfigPath, '-n', $Namespace, 'get', 'pods,services,ingress')
}
finally {
    Remove-Item Env:DOCKER_CONFIG -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $tempDirectory) {
        Remove-Item -LiteralPath $tempDirectory -Recurse -Force
    }
    $registryPassword = $null
}
