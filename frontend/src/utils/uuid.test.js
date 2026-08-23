import { describe, expect, it, vi } from 'vitest';
import { createUuid } from './uuid';

describe('createUuid', () => {
  it('uses the native implementation when available', () => {
    const randomUUID = vi.fn(() => 'native-request-id');
    expect(createUuid({ randomUUID })).toBe('native-request-id');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('works when randomUUID is unavailable on an HTTP origin', () => {
    const cryptoApi = { getRandomValues: bytes => bytes.fill(17) };
    expect(createUuid(cryptoApi)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('has a final fallback when Web Crypto is unavailable', () => {
    expect(createUuid(null, () => 0.5)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
