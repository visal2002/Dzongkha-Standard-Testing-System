/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client, ServerSideEncryption } from '@aws-sdk/client-s3';
import { DomainException } from '@dzongjuk/common';

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly production: boolean;
  private readonly serverSideEncryption?: ServerSideEncryption;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('ASSESSMENT_BUCKET', 'dzongjuk-assessment');
    this.production = config.get<string>('NODE_ENV') === 'production';
    this.serverSideEncryption = config.get<ServerSideEncryption>('S3_SERVER_SIDE_ENCRYPTION');
    this.client = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'ap-south-1'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      if (this.production) {
        throw new Error(`Required assessment bucket ${this.bucket} is unavailable.`);
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async put(key: string, body: Buffer) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/octet-stream',
      ...(this.serverSideEncryption ? { ServerSideEncryption: this.serverSideEncryption } : {}),
      Metadata: { classification: 'exam-classified', encrypted: 'aes-256-gcm' },
    }));
  }

  async get(key: string): Promise<Buffer> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) throw new Error('Object body missing');
      return Buffer.from(await result.Body.transformToByteArray());
    } catch {
      throw new DomainException('ASSESSMENT_OBJECT_UNAVAILABLE', 'The encrypted document is unavailable.', 503);
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
