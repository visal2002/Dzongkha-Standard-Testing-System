/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';

/**
 * Startup validation for the settings a service cannot safely run without.
 *
 * Every message this module produces names the setting and says what is wrong with
 * it. None of them ever contains the value: a configuration error is written to the
 * service log, and a log line carrying a JWT signing key or a database password is
 * a worse problem than the misconfiguration it reports.
 *
 * Outside production a missing or weak value is reported as a warning and the
 * service still starts, so a developer with no .env keeps a working checkout. In
 * production the same finding aborts the boot - a service that comes up with a
 * placeholder signing key is indistinguishable, from the outside, from one that
 * came up correctly.
 */

/** A secret: rejected in production when absent, too short, or an obvious placeholder. */
export interface RequiredSecret {
  key: string;
  kind: 'secret';
  /** Defaults to 32 characters, the length assertSharedSecret already enforces. */
  minLength?: number;
}

/** A base URL: rejected when unparseable, and in production when not HTTPS. */
export interface RequiredUrl {
  key: string;
  kind: 'url';
  /**
   * Hostname substrings that indicate a non-production environment. Configuring a
   * production deployment against one of these sends live data to a test system, so
   * it is treated as a misconfiguration rather than a preference.
   */
  rejectHostsContaining?: string[];
  /**
   * Setting whose value 'true' waives the rejectHostsContaining check - and only
   * that check; the HTTPS requirement still applies.
   *
   * This exists because an environment can legitimately run with NODE_ENV=production
   * and still be pointed at an upstream's test system. deploy/k8s/staging does
   * exactly that: it sets NODE_ENV=production so the services behave as they will in
   * production, while integrating against the BIRMS staging gateway. Requiring that
   * environment to say so explicitly keeps the check meaningful for real production,
   * where the waiver must never be set.
   */
  allowNonProductionHostKey?: string;
}

export type RequiredSetting = RequiredSecret | RequiredUrl;

/**
 * Values shipped in .env.example, compose.yml and the deployment manifests as
 * "fill this in" markers. Any of them reaching production means a real secret was
 * never issued for that setting.
 */
const PLACEHOLDER_PATTERNS = [
  /replace[-_\s]?with/i,
  /change[-_\s]?me/i,
  /changeit/i,
  /development[-_\s]?only/i,
  /placeholder/i,
  /^your[-_]/i,
  /^<.*>$/,
  /^(secret|password|token|test|dummy|default|admin)$/i,
];

/** Distinct characters below which a value is padding rather than entropy. */
const MIN_DISTINCT_CHARACTERS = 8;

const isPlaceholder = (value: string) => PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
const distinctCharacters = (value: string) => new Set(value).size;

export const isProduction = (config: ConfigService) => config.get<string>('NODE_ENV') === 'production';

function checkSecret(value: string | undefined, setting: RequiredSecret): string | null {
  const minLength = setting.minLength ?? 32;
  if (!value || !value.trim()) return `${setting.key} is not set.`;
  const trimmed = value.trim();
  if (trimmed.length < minLength) return `${setting.key} is shorter than the required ${minLength} characters.`;
  if (isPlaceholder(trimmed)) return `${setting.key} still holds an example placeholder value.`;
  if (distinctCharacters(trimmed) < MIN_DISTINCT_CHARACTERS) {
    return `${setting.key} repeats too few distinct characters to be a generated secret.`;
  }
  return null;
}

/** The extra conditions a URL only has to satisfy in production. */
function checkProductionUrl(url: URL, setting: RequiredUrl): string | null {
  if (url.protocol !== 'https:') return `${setting.key} must use https in production.`;
  const host = url.hostname.toLowerCase();
  const matched = (setting.rejectHostsContaining ?? []).find((fragment) => host.includes(fragment.toLowerCase()));
  return matched ? `${setting.key} points at a host containing "${matched}", which is not a production endpoint.` : null;
}

function checkUrl(value: string | undefined, setting: RequiredUrl, production: boolean): string | null {
  if (!value || !value.trim()) return `${setting.key} is not set.`;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return `${setting.key} is not a valid absolute URL.`;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return `${setting.key} must use http or https.`;
  return production ? checkProductionUrl(url, setting) : null;
}

/**
 * Collects everything wrong with the given settings. Returns setting names and
 * reasons only - never a configured value.
 */
export function validateConfiguration(config: ConfigService, settings: RequiredSetting[]): string[] {
  const production = isProduction(config);
  return settings
    .map((setting) => {
      const value = config.get<string>(setting.key);
      return setting.kind === 'secret' ? checkSecret(value, setting) : checkUrl(value, setting, production);
    })
    .filter((problem): problem is string => problem !== null);
}

/**
 * Fails the boot in production when any required setting is missing or weak; warns
 * and continues everywhere else. `log` is injectable so tests can assert on the
 * warning without writing to the suite's output.
 */
export function assertConfiguration(
  config: ConfigService,
  settings: RequiredSetting[],
  serviceName: string,
  log: (message: string) => void = (message) => console.warn(message),
) {
  const problems = validateConfiguration(config, settings);
  if (!problems.length) return;
  const detail = problems.map((problem) => `  - ${problem}`).join('\n');
  if (isProduction(config)) {
    throw new Error(`${serviceName} cannot start: required configuration is missing or unsafe.\n${detail}`);
  }
  log(`${serviceName}: configuration warnings (these abort startup when NODE_ENV=production).\n${detail}`);
}
