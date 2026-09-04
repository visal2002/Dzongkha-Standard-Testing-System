/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * Startup configuration validation (Priority 8).
 *
 * The service must refuse to boot in production on a missing or placeholder secret,
 * warn but keep working elsewhere, and never put a configured value into the message
 * it produces - that last property is what makes it safe to log.
 */

import { ConfigService } from '@nestjs/config';
import { assertConfiguration, isProduction, RequiredSetting, validateConfiguration } from '../../libs/common/src/config-validation';

const configFor = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] } as unknown as ConfigService);

const JWT: RequiredSetting = { key: 'JWT_SECRET', kind: 'secret' };
const BIRMS: RequiredSetting = {
  key: 'BIRMS_BASE_URL',
  kind: 'url',
  rejectHostsContaining: ['stagging', 'staging'],
};

const STRONG_SECRET = 'Xq7#tR2wZ9mB4vK1nH6cJ8sL3dF5gP0y';

describe('secret validation', () => {
  it('accepts a long, high-entropy secret', () => {
    expect(validateConfiguration(configFor({ JWT_SECRET: STRONG_SECRET }), [JWT])).toEqual([]);
  });

  it('rejects a missing secret', () => {
    expect(validateConfiguration(configFor({}), [JWT])).toEqual(['JWT_SECRET is not set.']);
  });

  it('rejects a blank secret', () => {
    expect(validateConfiguration(configFor({ JWT_SECRET: '    ' }), [JWT])).toEqual(['JWT_SECRET is not set.']);
  });

  it('rejects a secret shorter than the required length', () => {
    expect(validateConfiguration(configFor({ JWT_SECRET: 'short' }), [JWT])).toEqual([
      'JWT_SECRET is shorter than the required 32 characters.',
    ]);
  });

  it.each([
    ['replace-with-at-least-32-random-characters'],
    ['change-me-change-me-change-me-change-me'],
    ['development-only-development-only-value'],
    ['<YOUR_PRODUCTION_SECRET_GOES_HERE_HERE>'],
    ['your-production-secret-value-goes-here!'],
  ])('rejects the example placeholder %s', (value) => {
    const problems = validateConfiguration(configFor({ JWT_SECRET: value }), [JWT]);
    expect(problems).toEqual(['JWT_SECRET still holds an example placeholder value.']);
  });

  it('rejects a long value padded from too few distinct characters', () => {
    const problems = validateConfiguration(configFor({ JWT_SECRET: 'abababababababababababababababababab' }), [JWT]);
    expect(problems).toEqual(['JWT_SECRET repeats too few distinct characters to be a generated secret.']);
  });

  it('honours a per-setting minimum length, as base64 master keys need', () => {
    const setting: RequiredSetting = { key: 'CERTIFICATE_MASTER_KEY_BASE64', kind: 'secret', minLength: 44 };
    const thirtyTwo = STRONG_SECRET;
    expect(validateConfiguration(configFor({ CERTIFICATE_MASTER_KEY_BASE64: thirtyTwo }), [setting])).toEqual([
      'CERTIFICATE_MASTER_KEY_BASE64 is shorter than the required 44 characters.',
    ]);
    expect(validateConfiguration(configFor({ CERTIFICATE_MASTER_KEY_BASE64: 'K7pQ2mZx9Bv4Nc1Rt6Ys3Wd8Hj5Lf0Ug2Ea7Ik4Oq1Pz' }), [setting])).toEqual([]);
  });
});

describe('URL validation', () => {
  it('accepts a well-formed https URL', () => {
    expect(validateConfiguration(configFor({ BIRMS_BASE_URL: 'https://birms.example.gov.bt/api-services' }), [BIRMS])).toEqual([]);
  });

  it('rejects a missing URL', () => {
    expect(validateConfiguration(configFor({}), [BIRMS])).toEqual(['BIRMS_BASE_URL is not set.']);
  });

  it('rejects a malformed URL', () => {
    expect(validateConfiguration(configFor({ BIRMS_BASE_URL: 'birms.example.gov.bt' }), [BIRMS])).toEqual([
      'BIRMS_BASE_URL is not a valid absolute URL.',
    ]);
  });

  it('rejects a non-http scheme', () => {
    expect(validateConfiguration(configFor({ BIRMS_BASE_URL: 'ftp://birms.example.gov.bt' }), [BIRMS])).toEqual([
      'BIRMS_BASE_URL must use http or https.',
    ]);
  });

  it('allows plain http outside production, for local development', () => {
    expect(validateConfiguration(configFor({ BIRMS_BASE_URL: 'http://localhost:9100' }), [BIRMS])).toEqual([]);
  });

  it('rejects plain http in production', () => {
    const config = configFor({ NODE_ENV: 'production', BIRMS_BASE_URL: 'http://birms.example.gov.bt' });
    expect(validateConfiguration(config, [BIRMS])).toEqual(['BIRMS_BASE_URL must use https in production.']);
  });

  // The DSTS-05 failure mode itself: production wired to the BIRMS staging gateway.
  it('rejects a staging host in production', () => {
    const config = configFor({ NODE_ENV: 'production', BIRMS_BASE_URL: 'https://birmsstagging.drc.gov.bt/api-services' });
    expect(validateConfiguration(config, [BIRMS])).toEqual([
      'BIRMS_BASE_URL points at a host containing "stagging", which is not a production endpoint.',
    ]);
  });

  it('permits the staging host outside production, which is where staging belongs', () => {
    const config = configFor({ NODE_ENV: 'staging', BIRMS_BASE_URL: 'https://birmsstagging.drc.gov.bt/api-services' });
    expect(validateConfiguration(config, [BIRMS])).toEqual([]);
  });
});

describe('assertConfiguration', () => {
  const settings = [JWT, BIRMS];

  it('starts silently when everything is configured', () => {
    const log = jest.fn();
    const config = configFor({ NODE_ENV: 'production', JWT_SECRET: STRONG_SECRET, BIRMS_BASE_URL: 'https://birms.example.gov.bt' });
    expect(() => assertConfiguration(config, settings, 'Registration Service', log)).not.toThrow();
    expect(log).not.toHaveBeenCalled();
  });

  it('aborts the boot in production and names every problem', () => {
    const config = configFor({ NODE_ENV: 'production', JWT_SECRET: 'change-me', BIRMS_BASE_URL: undefined });
    expect(() => assertConfiguration(config, settings, 'Registration Service', jest.fn())).toThrow(/cannot start/);
    try {
      assertConfiguration(config, settings, 'Registration Service', jest.fn());
    } catch (error) {
      expect((error as Error).message).toContain('JWT_SECRET');
      expect((error as Error).message).toContain('BIRMS_BASE_URL');
    }
  });

  it('warns but still starts outside production, so a fresh checkout runs', () => {
    const log = jest.fn<void, [string]>();
    const config = configFor({ NODE_ENV: 'development', JWT_SECRET: undefined, BIRMS_BASE_URL: undefined });
    expect(() => assertConfiguration(config, settings, 'Registration Service', log)).not.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain('JWT_SECRET is not set.');
  });

  // The point of the whole module: a configuration error is written to the service
  // log, so it must never carry the secret it is complaining about.
  it('never repeats a configured value in a warning or an error', () => {
    const log = jest.fn<void, [string]>();
    const leaky = 'sup3rSecretSigningKeyThatMustNeverBeLogged';
    const config = configFor({ NODE_ENV: 'development', JWT_SECRET: `${leaky}${leaky}`.slice(0, 20), BIRMS_BASE_URL: 'nonsense' });
    assertConfiguration(config, settings, 'Registration Service', log);
    expect(log.mock.calls[0][0]).not.toContain(leaky);

    const production = configFor({ NODE_ENV: 'production', JWT_SECRET: leaky.slice(0, 10), BIRMS_BASE_URL: 'nonsense' });
    try {
      assertConfiguration(production, settings, 'Registration Service', jest.fn());
      throw new Error('expected assertConfiguration to throw');
    } catch (error) {
      expect((error as Error).message).not.toContain(leaky.slice(0, 10));
    }
  });
});

describe('isProduction', () => {
  it.each([
    ['production', true],
    ['staging', false],
    ['development', false],
    [undefined, false],
  ])('treats NODE_ENV=%s as production: %s', (value, expected) => {
    expect(isProduction(configFor({ NODE_ENV: value }))).toBe(expected);
  });
});
