import * as crypto from 'crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  Unique,
} from 'typeorm';

import { Role } from 'src/modules/auth/entities/role.entity';
import { AuditingEntity } from 'src/modules/shared/entities/auditing.entity';

@Entity({ name: 'users' })
@Index('IDX_users_createdAt_id', ['createdAt', 'id'])
@Index(['firstName', 'lastName', 'email', 'phoneNumber', 'publicUserId'])
@Unique('users_unique_constraints', ['email', 'phoneNumber', 'publicUserId'])
export class User extends AuditingEntity {
  @Column({ type: 'varchar', length: 15 })
  firstName: string;

  @Column({ type: 'varchar', length: 15 })
  lastName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  publicUserId: string;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 15, unique: true, nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @ManyToMany(() => Role)
  @JoinTable({
    joinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'roleId',
      referencedColumnName: 'id',
    },
    name: 'user_roles',
  })
  roles: Role[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'addedById' })
  addedBy: User;

  @BeforeInsert()
  @BeforeUpdate()
  // Generate default avatar if not provided
  generateDefaultAvatar() {
    if (!this.avatarUrl && this.email) {
      // Generate a hash from the email address
      // and use it to create a Gravatar URL
      // Note: Gravatar requires the email to be lowercased
      const emailHash = crypto
        .createHash('md5')
        .update(this.email.toLowerCase())
        .digest('hex');
      this.avatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=200`;
    }
  }

  @BeforeInsert()
  generatePublicUserId() {
    this.publicUserId ??= crypto.randomUUID();
  }

  static async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  async verifyPassword(plainTextPassword: string): Promise<boolean> {
    if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(this.password ?? '')) return false;
    const [salt, storedHash] = this.password.split(':');
    return new Promise((resolve, reject) => {
      crypto.scrypt(plainTextPassword, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(
          crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), derivedKey),
        );
      });
    });
  }

  get toFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get toListDto() {
    return {
      id: this.id,
      bio: this.bio,
      email: this.email,
      lastName: this.lastName,
      firstName: this.firstName,
      fullName: this.toFullName,
      createdAt: this.createdAt,
      avatarUrl: this.avatarUrl,
      phoneNumber: this.phoneNumber,
      publicUserId: this.publicUserId,
      roles: (this.roles ?? []).map((r) => r?.toListDto),
    };
  }
}
