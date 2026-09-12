import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { AuthSession } from './auth-session.entity';

@Entity('auth_refresh_tokens')
@Index('IDX_auth_refresh_tokens_session', ['sessionId'])
export class RefreshToken {
  @PrimaryColumn('uuid', { primaryKeyConstraintName: 'PK_auth_refresh_tokens' })
  id: string;
  @Column('uuid') sessionId: string;
  @ManyToOne(() => AuthSession, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'sessionId',
    foreignKeyConstraintName: 'FK_auth_refresh_tokens_session',
  })
  session: AuthSession;
  @Column({ type: 'varchar', length: 64, select: false }) tokenHash: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) usedAt: Date | null;
}
