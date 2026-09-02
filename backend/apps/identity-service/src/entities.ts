/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  VersionColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 120 }) name: string;
  @Column({ length: 240, default: '' }) description: string;
}

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 64 }) code: string;
  @Column({ length: 120 }) name: string;
  @Column({ default: false }) administrative: boolean;
  @Column({ default: true }) active: boolean;
  @ManyToMany(() => PermissionEntity, { eager: true })
  @JoinTable({ name: 'role_permissions' })
  permissions: PermissionEntity[];
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 254 }) email: string;
  @Index({ unique: true }) @Column({ type: 'varchar', length: 32, nullable: true }) cid: string | null;
  // System-assigned 4-digit login handle. Users register with their 11-digit CID and
  // sign in with this shorter id (or their email). Populated on registration and on
  // NDI/admin provisioning; nullable so legacy rows created before this column remain valid.
  @Index({ unique: true }) @Column({ type: 'varchar', length: 4, nullable: true }) userId: string | null;
  @Column({ length: 160 }) fullName: string;
  @Column({ type: 'varchar', select: false, nullable: true }) passwordHash: string | null;
  @Column({ default: 'ACTIVE' }) status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  @Column({ default: 0 }) failedLoginCount: number;
  @Column({ type: 'timestamptz', nullable: true }) lockedUntil: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) ndiLinkedAt: Date | null;
  @ManyToMany(() => RoleEntity, { eager: true })
  @JoinTable({ name: 'user_roles' })
  roles: RoleEntity[];
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

@Entity('sessions')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' }) user: UserEntity;
  @Index({ unique: true }) @Column({ length: 64 }) refreshTokenHash: string;
  @Column({ length: 16 }) assurance: 'LOCAL' | 'NDI' | 'MFA';
  @Column({ type: 'timestamptz' }) lastActivityAt: Date;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt: Date | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) ipHash: string | null;
  @Column({ type: 'varchar', length: 512, nullable: true }) userAgent: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('login_attempts')
export class LoginAttemptEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 254 }) identifier: string;
  @Column() success: boolean;
  @Column({ type: 'varchar', length: 64, nullable: true }) ipHash: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) reason: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('ndi_login_requests')
export class NdiLoginRequestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 80 }) threadId: string;
  @Index({ unique: true }) @Column({ length: 64 }) pollTokenHash: string;
  @Column({ length: 16, default: 'PENDING' }) status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'FAILED' | 'CANCELLED' | 'CONSUMED';
  @Column({ type: 'text' }) proofRequestUrl: string;
  @Column({ type: 'text', nullable: true }) deepLinkUrl: string | null;
  @Column({ type: 'jsonb', default: {} }) verifiedIdentity: { cid?: string; fullName?: string; relationshipDid?: string };
  @ManyToOne(() => UserEntity, { eager: true, nullable: true, onDelete: 'SET NULL' }) user: UserEntity | null;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) completedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) consumedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('audit_events')
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ length: 80 }) action: string;
  @Column({ length: 80 }) resourceType: string;
  @Index() @Column({ type: 'varchar', length: 80, nullable: true }) resourceId: string | null;
  @Column({ type: 'uuid', nullable: true }) actorUserId: string | null;
  @Column({ length: 64 }) requestId: string;
  @Column({ type: 'jsonb', default: {} }) safeData: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) occurredAt: Date;
}

@Entity('master_configuration')
export class MasterConfigurationEntity {
  @PrimaryColumn({ type: 'varchar', length: 32, default: 'SYSTEM' }) id: string;
  @Column({ type: 'jsonb' }) configuration: Record<string, unknown>;
  @Column({ type: 'uuid', nullable: true }) updatedByUserId: string | null;
  @VersionColumn() version: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
