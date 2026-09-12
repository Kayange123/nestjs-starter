import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { Role } from '../../auth/entities/role.entity';

const input = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'Strong:Password1',
};
describe('UsersService persistence and password boundaries', () => {
  let service: UsersService;
  const repository = {
    manager: { transaction: jest.fn() },
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    findAndCount: jest.fn(),
  };
  beforeEach(async () => {
    jest.resetAllMocks();
    repository.manager.transaction.mockImplementation(async (work) =>
      work({ getRepository: () => repository, update: jest.fn() }),
    );
    repository.create.mockImplementation((value) =>
      Object.assign(new User(), value),
    );
    repository.save.mockImplementation(async (value) => value);
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();
    service = module.get(UsersService);
  });
  it('creates an email-only account with a generated ID and hashed colon password', async () => {
    const user = await service.create(input);
    expect(user.publicUserId).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.phoneNumber).toBeUndefined();
    expect(user.password).not.toBe(input.password);
    expect(await user.verifyPassword(input.password)).toBe(true);
    expect(await user.verifyPassword('wrong')).toBe(false);
  });
  it('hashes even a plaintext password resembling the stored format', async () => {
    const password = 'a'.repeat(32) + ':' + 'b'.repeat(128);
    const user = await service.create({ ...input, password });
    expect(user.password).not.toBe(password);
    expect(await user.verifyPassword(password)).toBe(true);
  });
  it('rejects duplicate email without writing', async () => {
    repository.findOne.mockResolvedValue(new User());
    await expect(service.create(input)).rejects.toThrow('Email already exists');
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('changes the password once and preserves it on a later profile edit', async () => {
    const user = Object.assign(new User(), input, {
      id: 1,
      password: await User.hashPassword(input.password),
    });
    repository.findOne.mockResolvedValue(user);
    await service.update(1, { password: 'New:Password123' });
    expect(await user.verifyPassword('New:Password123')).toBe(true);
    expect(await user.verifyPassword(input.password)).toBe(false);
    const hash = user.password;
    await service.update(1, { firstName: 'Changed' });
    expect(user.password).toBe(hash);
  });
  it('loads roles for JWT authorization', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(new User(), {
        id: 1,
        roles: [Object.assign(new Role(), { name: 'Admin' })],
      }),
    );
    await service.findById(1);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: { roles: true },
    });
  });
  it('rejects missing accounts', async () => {
    await expect(service.findById(99)).rejects.toThrow('not found');
  });
  it.each(['plain:password', '', 'invalid', 'a:b:c'])(
    'rejects malformed stored hashes: %s',
    async (password) => {
      expect(
        await Object.assign(new User(), { password }).verifyPassword('test'),
      ).toBe(false);
    },
  );
});
