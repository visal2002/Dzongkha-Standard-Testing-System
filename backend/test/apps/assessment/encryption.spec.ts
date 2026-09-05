/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ConfigService } from '@nestjs/config';
import { DomainException } from '@dzongjuk/common';
import { EncryptionService } from '../../../apps/assessment-content-service/src/encryption.service';

describe('Assessment encryption', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('round-trips a document with AES-256-GCM and a wrapped data key', () => {
    const service = new EncryptionService(new ConfigService({ ASSESSMENT_MASTER_KEY_BASE64: key, ASSESSMENT_KEY_VERSION: 'test-v1' }));
    const plaintext = Buffer.from('%PDF-1.7 classified content');
    const encrypted = service.encrypt(plaintext);
    expect(encrypted.ciphertext.equals(plaintext)).toBe(false);
    expect(encrypted.wrappedKey).not.toContain(plaintext.toString('base64'));
    expect(service.decrypt(encrypted.ciphertext, encrypted)).toEqual(plaintext);
  });

  it('rejects tampered ciphertext', () => {
    const service = new EncryptionService(new ConfigService({ ASSESSMENT_MASTER_KEY_BASE64: key, ASSESSMENT_KEY_VERSION: 'test-v1' }));
    const encrypted = service.encrypt(Buffer.from('sensitive'));
    encrypted.ciphertext[0] ^= 0xff;
    expect(() => service.decrypt(encrypted.ciphertext, encrypted)).toThrow();
  });

  // Regression: rotating ASSESSMENT_MASTER_KEY_BASE64 without bumping ASSESSMENT_KEY_VERSION
  // leaves every earlier document recording the current version, so the version guard passes
  // and the unwrap fails instead. That used to escape as a bare crypto error and reach the
  // caller as an opaque 500, which told a candidate nothing about why a download failed.
  it('reports a rotated master key as an actionable domain error', () => {
    const original = new EncryptionService(new ConfigService({ ASSESSMENT_MASTER_KEY_BASE64: key, ASSESSMENT_KEY_VERSION: 'test-v1' }));
    const rotated = new EncryptionService(new ConfigService({
      ASSESSMENT_MASTER_KEY_BASE64: Buffer.alloc(32, 9).toString('base64'), ASSESSMENT_KEY_VERSION: 'test-v1',
    }));
    const encrypted = original.encrypt(Buffer.from('%PDF-1.7 classified content'));

    let thrown: unknown;
    try { rotated.decrypt(encrypted.ciphertext, encrypted); } catch (error) { thrown = error; }

    expect(thrown).toBeInstanceOf(DomainException);
    expect((thrown as DomainException).getStatus()).toBe(503);
    expect((thrown as DomainException).getResponse()).toMatchObject({ code: 'ASSESSMENT_DOCUMENT_UNDECRYPTABLE' });
  });

  it('fails production startup without a 256-bit master key', () => {
    expect(() => new EncryptionService(new ConfigService({ NODE_ENV: 'production', ASSESSMENT_MASTER_KEY_BASE64: 'bad' }))).toThrow(/32 bytes/);
  });
});
