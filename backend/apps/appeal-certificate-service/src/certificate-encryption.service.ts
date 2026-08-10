/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '@dzongjuk/common';

export interface CertificateEncryptionMetadata {
  dataIv: string;
  dataAuthTag: string;
  wrappedKey: string;
  wrapIv: string;
  wrapAuthTag: string;
  keyVersion: string;
}

@Injectable()
export class CertificateEncryptionService {
  private readonly masterKey: Buffer;
  private readonly keyVersion: string;

  constructor(config: ConfigService) {
    const encoded = config.get<string>('CERTIFICATE_MASTER_KEY_BASE64');
    this.masterKey = encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
    this.keyVersion = config.get<string>('CERTIFICATE_KEY_VERSION', '1');
    if (config.get<string>('NODE_ENV') === 'production' && this.masterKey.length !== 32) {
      throw new Error('CERTIFICATE_MASTER_KEY_BASE64 must decode to exactly 32 bytes in production.');
    }
  }

  encrypt(plaintext: Buffer): { ciphertext: Buffer } & CertificateEncryptionMetadata {
    this.assertKey();
    const dataKey = randomBytes(32);
    const dataIv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dataKey, dataIv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const wrapIv = randomBytes(12);
    const wrapper = createCipheriv('aes-256-gcm', this.masterKey, wrapIv);
    const wrappedKey = Buffer.concat([wrapper.update(dataKey), wrapper.final()]);
    const metadata = {
      ciphertext, dataIv: dataIv.toString('base64'), dataAuthTag: cipher.getAuthTag().toString('base64'),
      wrappedKey: wrappedKey.toString('base64'), wrapIv: wrapIv.toString('base64'),
      wrapAuthTag: wrapper.getAuthTag().toString('base64'), keyVersion: this.keyVersion,
    };
    dataKey.fill(0);
    return metadata;
  }

  decrypt(ciphertext: Buffer, metadata: CertificateEncryptionMetadata) {
    this.assertKey();
    if (metadata.keyVersion !== this.keyVersion) throw new DomainException('CERTIFICATE_KEY_VERSION_UNAVAILABLE', 'The required certificate encryption key is unavailable.', 503);
    const unwrapper = createDecipheriv('aes-256-gcm', this.masterKey, Buffer.from(metadata.wrapIv, 'base64'));
    unwrapper.setAuthTag(Buffer.from(metadata.wrapAuthTag, 'base64'));
    const dataKey = Buffer.concat([unwrapper.update(Buffer.from(metadata.wrappedKey, 'base64')), unwrapper.final()]);
    try {
      const decipher = createDecipheriv('aes-256-gcm', dataKey, Buffer.from(metadata.dataIv, 'base64'));
      decipher.setAuthTag(Buffer.from(metadata.dataAuthTag, 'base64'));
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } finally { dataKey.fill(0); }
  }

  private assertKey() {
    if (this.masterKey.length !== 32) throw new DomainException('CERTIFICATE_MASTER_KEY_INVALID', 'Certificate encryption is not configured.', 503);
  }
}
