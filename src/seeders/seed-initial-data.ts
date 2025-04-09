import { DataSource } from 'typeorm';

import { Role } from 'src/modules/auth/entities/role.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Permission } from 'src/modules/auth/entities/permission.entity';
import { generateResourcePermissions } from 'src/seeders/generate-permissions';

export const seedInitialData = async (dataSource: DataSource) => {
  console.log('Seeding Initial Data');

  // Create permissions
  const permissionsRepository = dataSource.getRepository(Permission);
  const permissionsData = generateResourcePermissions(
    ['edit', 'read', 'delete', 'create'],
    ['user', 'role', 'permission'],
  );

  const permissions = await Promise.all(
    permissionsData.map(async (permData) => {
      const existingPerm = await permissionsRepository.findOneBy({
        genericName: permData.genericName,
      });

      if (existingPerm) return existingPerm;

      const perm = permissionsRepository.create(permData);
      return permissionsRepository.save(perm);
    }),
  );

  // Create roles
  const rolesRepository = dataSource.getRepository(Role);

  const adminRole = await rolesRepository.findOne({
    where: { name: 'Admin' },
  });

  if (!adminRole) {
    const newAdminRole = rolesRepository.create({
      name: 'Admin',
      isSystemRole: true,
      description: 'Administrator role',
      permissions: permissions,
    });
    await rolesRepository.save(newAdminRole);
  } else {
    adminRole.permissions = permissions;
    await rolesRepository.save(adminRole);
  }

  const userRole = await rolesRepository.findOne({
    where: { name: 'User' },
  });

  if (!userRole) {
    const newUserRole = rolesRepository.create({
      name: 'User',
      description: 'Standard user role',
      permissions: permissions.filter((p) => p.genericName.includes('read')),
    });
    await rolesRepository.save(newUserRole);
  }

  // Create admin user if it doesn't exist
  const usersRepository = dataSource.getRepository(User);
  const adminUser = await usersRepository.findOne({
    where: { email: 'admin@example.com' },
  });

  if (!adminUser) {
    const roles = await rolesRepository.find({
      where: [{ name: 'Admin' }],
    });

    const newAdmin = usersRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'Admin@123',
      roles,
    });

    await usersRepository.save(newAdmin);
    console.log('Admin user created');
  }
};
