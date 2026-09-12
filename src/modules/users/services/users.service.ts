import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AuthSession } from '../../auth/entities/auth-session.entity';
import { randomUUID } from 'crypto';

import { User } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { mapUserQuery } from '../repositories/user-query.mapper';
import {
  PaginatedResult,
  paginateResult,
} from '../../shared/dto/paginated-result';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.userRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: await User.hashPassword(createUserDto.password),
      publicUserId: randomUUID(),
    });
    return this.userRepository.save(user);
  }

  async findAll(
    query: UserQueryDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const [users, count] = await this.userRepository.findAndCount(
      mapUserQuery(query),
    );
    return paginateResult(
      users.map((user) => new UserResponseDto(user)),
      count,
      query.page,
      query.limit,
    );
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmailOrPhoneNumber(userName: string): Promise<User> {
    return this.userRepository.findOne({
      where: [{ email: userName }, { phoneNumber: userName }],
      select: { id: true, email: true, password: true },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const password =
      updateUserDto.password === undefined
        ? undefined
        : await User.hashPassword(updateUserDto.password);

    const apply = (target: User) => {
      for (const field of ['firstName', 'lastName', 'email'] as const) {
        if (updateUserDto[field] !== undefined)
          target[field] = updateUserDto[field];
      }
      if (password !== undefined) target.password = password;
    };
    if (password !== undefined) {
      await this.userRepository.manager.transaction(async (manager) => {
        const repository = manager.getRepository(User);
        const locked = await repository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked)
          throw new NotFoundException(`User with ID ${id} not found`);
        apply(locked);
        await repository.save(locked);
        await manager.update(
          AuthSession,
          { userId: id, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
      });
      this.logger.log({ event: 'auth.password.changed', userId: id });
      return this.findById(id);
    }
    apply(user);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.softRemove(user);
  }
}
