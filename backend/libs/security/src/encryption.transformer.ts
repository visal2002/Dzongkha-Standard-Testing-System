/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ValueTransformer } from 'typeorm';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class AesGcmEncryptionTransformer implements ValueTransformer {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.length !== 32) {
      throw new Error('Encryption transformer requires a 32-byte (256-bit) base64-encoded key.');
    }
  }

  to(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const json = JSON.stringify(value);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(json, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');
    const ivBase64 = iv.toString('base64');
    
    return `enc:v1:${ivBase64}:${authTag}:${encrypted}`;
  }

  from(value: string | null): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string' || !value.startsWith('enc:v1:')) {
      // Fallback for unencrypted legacy data
      try {
        if (typeof value === 'object') return value;
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    const [, , ivBase64, authTagBase64, encrypted] = value.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
