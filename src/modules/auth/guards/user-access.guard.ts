import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class UserAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: User }>();
    const rawId = request.params.id;
    if (
      typeof rawId !== 'string' ||
      !/^[1-9]\d*$/.test(rawId) ||
      !Number.isSafeInteger(Number(rawId))
    ) {
      throw new BadRequestException('id must be a positive integer');
    }
    return (
      request.user?.id === Number(rawId) ||
      !!request.user?.roles?.some((role) => role.name === 'Admin')
    );
  }
}
