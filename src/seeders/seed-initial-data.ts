import { DatabaseCommandError } from '../database/command-error';
import { DataSource } from 'typeorm';
import { isEmail, isStrongPassword } from 'class-validator';
import { Role } from '../modules/auth/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import { Permission } from '../modules/auth/entities/permission.entity';
import { generateResourcePermissions } from './generate-permissions';

export interface SeedAdmin {
  email: string;
  password: string;
}
export function validateSeedAdmin(admin: SeedAdmin): void {
  if (!isEmail(admin.email) || admin.email.length > 30)
    throw new DatabaseCommandError(
      'SEED_ADMIN_EMAIL must be a valid email of at most 30 characters',
    );
  if (
    typeof admin.password !== 'string' ||
    admin.password.length > 128 ||
    !isStrongPassword(admin.password, { minLength: 8 })
  )
    throw new DatabaseCommandError(
      'SEED_ADMIN_PASSWORD must satisfy the registration password policy',
    );
}

export async function seedInitialData(source: DataSource, admin?: SeedAdmin) {
  if (admin) validateSeedAdmin(admin);
  const passwordHash = admin
    ? await User.hashPassword(admin.password)
    : undefined;
  return source.transaction(async (manager) => {
    const schema =
      'schema' in source.options
        ? (source.options.schema ?? 'public')
        : 'public';
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      ['nestjs-starter:seed', schema],
    );
    const permissionRepository = manager.getRepository(Permission);
    const roleRepository = manager.getRepository(Role);
    const userRepository = manager.getRepository(User);
    let permissionsCreated = 0;
    let rolesCreated = 0;
    const permissions: Permission[] = [];
    for (const data of generateResourcePermissions(
      ['edit', 'read', 'delete', 'create'],
      ['user', 'role', 'permission'],
    )) {
      let permission = await permissionRepository.findOne({
        where: { genericName: data.genericName },
        withDeleted: true,
      });
      if (permission?.deletedAt)
        throw new DatabaseCommandError(
          'A default permission was soft-deleted; review it before seeding',
        );
      if (!permission) {
        permission = await permissionRepository.save(
          permissionRepository.create(data),
        );
        permissionsCreated++;
      }
      permissions.push(permission);
    }
    let adminRole: Role;
    for (const name of ['Admin', 'User']) {
      let role = await roleRepository.findOne({
        where: { name },
        withDeleted: true,
      });
      if (role?.deletedAt)
        throw new DatabaseCommandError(
          'A default role was soft-deleted; review it before seeding',
        );
      if (!role) {
        role = await roleRepository.save(
          roleRepository.create({
            name,
            isSystemRole: name === 'Admin',
            description:
              name === 'Admin' ? 'Administrator role' : 'Standard user role',
            permissions:
              name === 'Admin'
                ? permissions
                : permissions.filter((permission) =>
                    permission.genericName.startsWith('read:'),
                  ),
          }),
        );
        rolesCreated++;
      }
      if (name === 'Admin') adminRole = role;
    }
    let administrator: 'not-requested' | 'created' | 'unchanged' =
      'not-requested';
    if (admin) {
      const existing = await userRepository.findOne({
        where: { email: admin.email },
        relations: { roles: true },
        withDeleted: true,
      });
      if (existing) {
        if (
          existing.deletedAt ||
          !existing.roles.some((role) => role.name === 'Admin')
        )
          throw new DatabaseCommandError(
            'Refusing to promote or reactivate an existing account through seeding',
          );
        administrator = 'unchanged';
      } else {
        await userRepository.save(
          userRepository.create({
            firstName: 'Bootstrap',
            lastName: 'Admin',
            email: admin.email,
            password: passwordHash,
            roles: [adminRole],
          }),
        );
        administrator = 'created';
      }
    }
    return { permissionsCreated, rolesCreated, administrator };
  });
}
