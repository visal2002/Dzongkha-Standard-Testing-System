/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * Configuration verification for DSTS-02.
 *
 * Several endpoints authenticate the caller with the shared INTERNAL_SERVICE_SECRET
 * in an X-Internal-Service-Key header instead of a user session
 * (libs/common/src/internal-auth.ts). nginx forwards unrecognised client headers to
 * the upstream by default, so unless a public gateway is told otherwise a browser
 * can put that header on a request and have it arrive at the service exactly as a
 * peer service's would. These tests parse the checked-in gateway configurations and
 * assert two independent defences hold on every public listener:
 *
 *   1. the header is pinned to "" (nginx omits an empty header rather than sending
 *      the client's), and
 *   2. the internal-only paths resolve to `return 404` before reaching any
 *      proxy_pass at all.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '..', '..', '..');

const PUBLIC_GATEWAYS = [
  { name: 'backend/deploy/docker/nginx.conf', path: join(repoRoot, 'backend', 'deploy', 'docker', 'nginx.conf'), listen: '8000' },
  { name: 'deploy/k8s/staging/api-gateway.conf', path: join(repoRoot, 'deploy', 'k8s', 'staging', 'api-gateway.conf'), listen: '8000' },
  { name: 'frontend/nginx.staging.conf', path: join(repoRoot, 'frontend', 'nginx.staging.conf'), listen: '8080' },
];

/** Every route that trusts X-Internal-Service-Key in place of a user session. */
const INTERNAL_ONLY_PATHS = [
  '/api/v1/admin/users/00000000-0000-4000-8000-000000000001/internal-contact',
  '/api/v1/applications/internal/11111111-1111-4111-8111-111111111111/certificate-profile',
  '/api/v1/applications/internal/11111111-1111-4111-8111-111111111111/contact',
  '/api/v1/appeals/22222222-2222-4222-8222-222222222222/payment/confirm',
  '/api/v1/internal/exams/33333333-3333-4333-8333-333333333333/certificate-results',
  '/api/v1/internal/score-sheets/44444444-4444-4444-8444-444444444444/appeal-revisions',
];

/** Ordinary user-facing routes, here to prove the deny rules above are not over-broad. */
const PUBLIC_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/admin/users',
  '/api/v1/applications',
  '/api/v1/appeals',
  '/api/v1/appeals/22222222-2222-4222-8222-222222222222',
  '/api/v1/certificates/55555555-5555-4555-8555-555555555555',
  '/api/v1/public/certificates/verify/token.signature',
];

const read = (path: string) => readFileSync(path, 'utf8');

/** Index of the brace closing the block that opens at `open`. */
function closingBrace(text: string, open: number) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error('unbalanced braces in nginx configuration');
}

/** Slices out the `server { ... }` block whose `listen` matches. */
function serverBlock(config: string, listen: string) {
  let cursor = 0;
  for (;;) {
    const start = config.indexOf('server', cursor);
    if (start === -1) throw new Error(`no server block listening on ${listen}`);
    const open = config.indexOf('{', start);
    const end = closingBrace(config, open);
    const block = config.slice(open, end + 1);
    if (new RegExp(`listen\\s+${listen}\\s*;`).test(block)) return block;
    cursor = end + 1;
  }
}

/**
 * The regex `location` blocks of a server, in declaration order - which is the order
 * nginx tries them in, first match winning.
 */
function regexLocations(block: string) {
  const locations: Array<{ pattern: string; body: string }> = [];
  const header = /location\s+~\s+(\S+)\s*\{/g;
  let match = header.exec(block);
  while (match) {
    const open = block.indexOf('{', match.index + match[0].length - 1);
    const end = closingBrace(block, open);
    locations.push({ pattern: match[1], body: block.slice(open + 1, end) });
    header.lastIndex = end;
    match = header.exec(block);
  }
  return locations;
}

/** The first regex location matching `path`, mirroring nginx's first-match-wins order. */
const resolve = (block: string, path: string) => regexLocations(block).find((location) => new RegExp(location.pattern).test(path));

describe('DSTS-02: public gateways cannot pass a client-supplied internal service key', () => {
  describe.each(PUBLIC_GATEWAYS)('$name', ({ path, listen }) => {
    const block = serverBlock(read(path), listen);

    it('pins X-Internal-Service-Key to the empty string so nginx drops the client value', () => {
      expect(block).toMatch(/proxy_set_header\s+X-Internal-Service-Key\s+""\s*;/);
    });

    it('never forwards the client-supplied header variable', () => {
      expect(block).not.toMatch(/\$http_x_internal_service_key/i);
    });
  });

  it.each(PUBLIC_GATEWAYS.filter((gateway) => gateway.listen === '8000'))(
    '$name declares the strip at server level, so no location can inherit its way around it',
    ({ path, listen }) => {
      // nginx replaces inherited proxy_set_header directives instead of merging
      // them: a location declaring any proxy_set_header of its own would silently
      // drop the server-level strip. Guard that by requiring the strip to precede
      // every location, and no location to set proxy_set_header at all.
      const block = serverBlock(read(path), listen);
      // Anchored on a real `location <modifier>` directive rather than the bare
      // word, which also appears in the comments above these blocks.
      const beforeFirstLocation = block.slice(0, block.search(/\blocation\s+[~=/]/));
      expect(beforeFirstLocation).toMatch(/proxy_set_header\s+X-Internal-Service-Key\s+""\s*;/);
      for (const location of regexLocations(block)) {
        expect(location.body).not.toMatch(/proxy_set_header/);
      }
    },
  );

  // The frontend edge proxy is a single `location /api/` prefix block rather than
  // the regex routing table the two API gateways use, so it is asserted separately.
  it('frontend/nginx.staging.conf strips the header on the /api/ proxy block', () => {
    const config = read(join(repoRoot, 'frontend', 'nginx.staging.conf'));
    const api = config.slice(config.indexOf('location /api/'));
    expect(api.slice(0, api.indexOf('}'))).toMatch(/proxy_set_header\s+X-Internal-Service-Key\s+""\s*;/);
  });
});

describe('DSTS-02: internal-only endpoints are not routable through a public gateway', () => {
  const apiGateways = PUBLIC_GATEWAYS.filter((gateway) => gateway.name !== 'frontend/nginx.staging.conf');

  describe.each(apiGateways)('$name', ({ path, listen }) => {
    const block = serverBlock(read(path), listen);

    it.each(INTERNAL_ONLY_PATHS)('refuses %s before any proxy_pass', (requestPath) => {
      const location = resolve(block, requestPath);
      expect(location).toBeDefined();
      expect(location!.body).toMatch(/return\s+404\s*;/);
      expect(location!.body).not.toMatch(/proxy_pass/);
    });

    it.each(PUBLIC_PATHS)('still routes %s to its service', (requestPath) => {
      const location = resolve(block, requestPath);
      expect(location).toBeDefined();
      expect(location!.body).toMatch(/proxy_pass/);
    });
  });
});

describe('DSTS-02: the internal listener stays off the public gateways', () => {
  it('only the local compose gateway defines an internal listener, and compose binds it to loopback', () => {
    const local = read(join(repoRoot, 'backend', 'deploy', 'docker', 'nginx.conf'));
    const staging = read(join(repoRoot, 'deploy', 'k8s', 'staging', 'api-gateway.conf'));
    const compose = read(join(repoRoot, 'backend', 'compose.yml'));

    expect(local).toMatch(/listen\s+8010\s*;/);
    expect(staging).not.toMatch(/listen\s+8010\s*;/);
    // Published as 127.0.0.1:8010 rather than 8010, which would bind 0.0.0.0.
    expect(compose).toMatch(/"127\.0\.0\.1:8010:8010"/);
  });

  it('the internal listener forwards the header only on internal-only routes', () => {
    const block = serverBlock(read(join(repoRoot, 'backend', 'deploy', 'docker', 'nginx.conf')), '8010');
    expect(block).toMatch(/proxy_set_header\s+X-Internal-Service-Key\s+\$http_x_internal_service_key\s*;/);
    for (const requestPath of INTERNAL_ONLY_PATHS) {
      expect(resolve(block, requestPath)?.body).toMatch(/proxy_pass/);
    }
    // Anything else has no regex location and falls through to the catch-all 404.
    for (const requestPath of PUBLIC_PATHS) {
      expect(resolve(block, requestPath)).toBeUndefined();
    }
  });
});
