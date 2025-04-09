import { Column, Entity } from 'typeorm';

import { AuditingEntity } from 'src/modules/shared/entities/auditing.entity';

@Entity({ name: 'permissions' })
export class Permission extends AuditingEntity {
  @Column({ type: 'varchar', length: 30, unique: true })
  displayName: string;

  @Column({ type: 'varchar', unique: true, length: 30, nullable: true })
  genericName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  module: string;

  get toListDto() {
    return {
      id: this.id,
      module: this.module,
      displayName: this.displayName,
      genericName: this.genericName,
    };
  }
}
