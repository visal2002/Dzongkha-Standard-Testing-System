import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '..', '..', '..');
const read = (...parts: string[]) => readFileSync(join(repoRoot, ...parts), 'utf8');

const REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'Permissions-Policy',
  'Referrer-Policy',
];

describe('PT remediation: browser-facing nginx policies', () => {
  const configs = [
    ['deploy/k8s/staging/api-gateway.conf', read('deploy', 'k8s', 'staging', 'api-gateway.conf')],
    ['backend/deploy/docker/nginx.conf', read('backend', 'deploy', 'docker', 'nginx.conf')],
    ['frontend/security-headers.conf', read('frontend', 'security-headers.conf')],
  ] as const;

  it.each(configs)('%s suppresses version disclosure and defines every required policy', (_name, config) => {
    expect(config).toMatch(/server_tokens\s+off\s*;/);
    for (const header of REQUIRED_HEADERS) expect(config).toContain(header);
  });

  it('uses an enforced CSP instead of report-only mode', () => {
    const frontend = read('frontend', 'security-headers.conf');
    expect(frontend).toContain('Content-Security-Policy ');
    expect(frontend).not.toContain('Content-Security-Policy-Report-Only');
  });

  it('returns explicit JSON responses for scanner-sensitive utility paths', () => {
    const gateway = read('deploy', 'k8s', 'staging', 'api-gateway.conf');
    expect(gateway).toMatch(/location = \/health\/live/);
    expect(gateway).toMatch(/location = \/health\/ready/);
    expect(gateway).toMatch(/location = \/metrics \{ return 404;/);
    expect(gateway).toMatch(/location = \/api \{ return 404;/);
    expect(gateway).toContain('default_type application/json;');
  });
});

describe('PT remediation: NestJS service headers', () => {
  const platform = read('backend', 'libs', 'common', 'src', 'platform.ts');

  it('enables isolation headers and a restrictive feature policy', () => {
    expect(platform).toContain('crossOriginEmbedderPolicy');
    expect(platform).toContain('crossOriginOpenerPolicy');
    expect(platform).toContain('crossOriginResourcePolicy');
    expect(platform).toContain('Permissions-Policy');
  });
});
