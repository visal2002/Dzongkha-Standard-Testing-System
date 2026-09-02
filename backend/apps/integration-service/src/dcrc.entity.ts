/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DcrcLookupStatus = 'MATCHED' | 'MISMATCH' | 'NOT_FOUND' | 'FAILED';

@Entity('dcrc_lookup_audits')
export class DcrcLookupAuditEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 64 }) cidHash: string;
  @Index() @Column({ type: 'uuid', nullable: true }) applicationId: string | null;
  @Column({ type: 'uuid', nullable: true }) requestedByUserId: string | null;
  @Column({ length: 16 }) status: DcrcLookupStatus;
  @Column({ type: 'smallint', nullable: true }) providerHttpStatus: number | null;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) matchedFields: string[];
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) mismatchFields: string[];
  @Column({ length: 64 }) requestId: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
