/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '@dzongjuk/common';

export interface EncryptedDocument {
  ciphertext: Buffer;
  dataIv: string;
  dataAuthTag: string;
  wrappedKey: string;
  wrapIv: string;
  wrapAuthTag: string;
  keyVersion: string;
}

export type EncryptionMetadata = Omit<EncryptedDocument, 'ciphertext'>;

@Injectable()
export class EncryptionService {
  private readonly masterKey: Buffer;
  private readonly keyVersion: string;

  constructor(config: ConfigService) {
    const encoded = config.get<string>('ASSESSMENT_MASTER_KEY_BASE64');
    this.masterKey = encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
    this.keyVersion = config.get<string>('ASSESSMENT_KEY_VERSION', '1');
    if (config.get<string>('NODE_ENV') === 'production' && this.masterKey.length !== 32) {
      throw new Error('ASSESSMENT_MASTER_KEY_BASE64 must decode to exactly 32 bytes in production.');
    }
  }

  encrypt(plaintext: Buffer): EncryptedDocument {
    this.assertMasterKey();
    const dataKey = randomBytes(32);
    const dataIv = randomBytes(12);
    const dataCipher = createCipheriv('aes-256-gcm', dataKey, dataIv);
    const ciphertext = Buffer.concat([dataCipher.update(plaintext), dataCipher.final()]);
    const dataAuthTag = dataCipher.getAuthTag();

    const wrapIv = randomBytes(12);
    const keyCipher = createCipheriv('aes-256-gcm', this.masterKey, wrapIv);
    const wrappedKey = Buffer.concat([keyCipher.update(dataKey), keyCipher.final()]);
    const wrapAuthTag = keyCipher.getAuthTag();
    dataKey.fill(0);

    return {
      ciphertext,
      dataIv: dataIv.toString('base64'),
      dataAuthTag: dataAuthTag.toString('base64'),
      wrappedKey: wrappedKey.toString('base64'),
      wrapIv: wrapIv.toString('base64'),
      wrapAuthTag: wrapAuthTag.toString('base64'),
      keyVersion: this.keyVersion,
    };
  }

  decrypt(ciphertext: Buffer, metadata: EncryptionMetadata): Buffer {
    this.assertMasterKey();
    if (metadata.keyVersion !== this.keyVersion) {
      throw new DomainException('ASSESSMENT_KEY_VERSION_UNAVAILABLE', 'The required encryption key version is unavailable.', 503);
    }
    const keyDecipher = createDecipheriv('aes-256-gcm', this.masterKey, Buffer.from(metadata.wrapIv, 'base64'));
    keyDecipher.setAuthTag(Buffer.from(metadata.wrapAuthTag, 'base64'));
    const dataKey = Buffer.concat([keyDecipher.update(Buffer.from(metadata.wrappedKey, 'base64')), keyDecipher.final()]);
    try {
      const decipher = createDecipheriv('aes-256-gcm', dataKey, Buffer.from(metadata.dataIv, 'base64'));
      decipher.setAuthTag(Buffer.from(metadata.dataAuthTag, 'base64'));
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } finally {
      dataKey.fill(0);
    }
  }

  private assertMasterKey() {
    if (this.masterKey.length !== 32) {
      throw new DomainException('ASSESSMENT_MASTER_KEY_INVALID', 'ASSESSMENT_MASTER_KEY_BASE64 must decode to exactly 32 bytes.', 503);
    }
  }
}
