import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('auth_sessions')
@Index('IDX_auth_sessions_user', ['userId'])
export class AuthSession {
  @PrimaryColumn('uuid', { primaryKeyConstraintName: 'PK_auth_sessions' })
  id: string;
  @Column('int') userId: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_auth_sessions_user',
  })
  user: User;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column('timestamptz') expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt: Date | null;
}
