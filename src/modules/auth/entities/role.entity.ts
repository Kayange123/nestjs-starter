import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { AuditingEntity } from '../../shared/entities/auditing.entity';
import { Permission } from './permission.entity';

@Entity({ name: 'roles' })
export class Role extends AuditingEntity {
  @Column({ unique: true, type: 'varchar', length: 50 })
  name: string;

  @Column({ default: false, type: 'boolean' })
  isSystemRole: boolean;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  description: string;

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  get toListDto() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isSystemRole: this.isSystemRole,
    };
  }

  get toDetailDto() {
    const response = {
      id: this.id,
      name: this.name,
      description: this.description,
      isSystemRole: this.isSystemRole,
    };

    if (this.permissions) {
      response['permissions'] = this.permissions.map(
        (permission) => permission.toListDto,
      );
    }

    return response;
  }
}
