/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * Priority 8: the example environment file and the startup checks have to agree.
 *
 * .env.example is the file a deployment is copied from, so every placeholder in it
 * must be one that config-validation rejects when NODE_ENV=production. If the two
 * ever drift - a new secret added to the template with a value that happens to look
 * plausible - a production deployment could boot on a value published in this
 * repository. These tests read the real file and check that cannot happen.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { validateConfiguration } from '../../libs/common/src/config-validation';

const envExamplePath = join(__dirname, '..', '..', '.env.example');
const envExample = readFileSync(envExamplePath, 'utf8');

/** Parses KEY=value lines, ignoring comments and blanks. */
function parseEnv(contents: string) {
  const values: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    values[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  return values;
}

const example = parseEnv(envExample);

/** Every secret any service declares in its main.ts `requires` list. */
const DECLARED_SECRETS = [
  { key: 'JWT_SECRET', minLength: 32 },
  { key: 'INTERNAL_SERVICE_SECRET', minLength: 32 },
  { key: 'CERTIFICATE_VERIFICATION_SECRET', minLength: 32 },
  { key: 'ASSESSMENT_MASTER_KEY_BASE64', minLength: 44 },
  { key: 'CERTIFICATE_MASTER_KEY_BASE64', minLength: 44 },
  { key: 'DATA_ENCRYPTION_KEY', minLength: 44 },
];

describe('.env.example is a template, not a set of usable secrets', () => {
  it.each(DECLARED_SECRETS)('$key appears in the template', ({ key }) => {
    expect(Object.prototype.hasOwnProperty.call(example, key)).toBe(true);
  });

  it.each(DECLARED_SECRETS)('the $key placeholder is refused in production', ({ key, minLength }) => {
    const config = { get: (name: string) => (name === 'NODE_ENV' ? 'production' : example[name]) } as unknown as ConfigService;
    const problems = validateConfiguration(config, [{ key, kind: 'secret', minLength }]);
    expect(problems).toHaveLength(1);
  });

  it('marks its fill-in values clearly enough to be spotted in review', () => {
    const filled = DECLARED_SECRETS.map(({ key }) => example[key]).filter((value) => value !== '');
    expect(filled.length).toBeGreaterThan(0);
    for (const value of filled) expect(value).toMatch(/CHANGE-ME/i);
  });

  it('does not carry a value that would pass as a real secret', () => {
    // A 32+ character, high-entropy value in the template is exactly the failure
    // this suite exists to catch.
    const config = { get: (name: string) => (name === 'NODE_ENV' ? 'production' : example[name]) } as unknown as ConfigService;
    const settings = DECLARED_SECRETS.map(({ key, minLength }) => ({ key, kind: 'secret' as const, minLength }));
    expect(validateConfiguration(config, settings)).toHaveLength(DECLARED_SECRETS.length);
  });

  it('documents that BIRMS_BASE_URL has no code fallback', () => {
    expect(envExample).toMatch(/BIRMS_BASE_URL has no default in code/);
  });

  it('lists DATA_ENCRYPTION_KEY, which the result service reads but the template used to omit', () => {
    expect(envExample).toMatch(/^DATA_ENCRYPTION_KEY=/m);
  });
});
