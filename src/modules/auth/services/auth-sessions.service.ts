import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { AppConfigService } from '../../../config/app-config.service';
import { User } from '../../users/entities/user.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenResponseDto } from '../dto/auth.dto';

export interface AccessTokenPayload {
  sub: number;
  sid: string;
  type: 'access';
  exp?: number;
}

@Injectable()
export class AuthSessionsService {
  private readonly logger = new Logger(AuthSessionsService.name);
  constructor(
    private readonly source: DataSource,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async create(
    userId: number,
    verifiedPasswordHash: string,
  ): Promise<TokenResponseDto> {
    const result = await this.source.transaction(async (manager) => {
      // Recheck the verified credential under the same user lock used for password changes.
      const user = await manager.getRepository(User).findOne({
        where: { id: userId },
        select: { id: true, password: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user || user.password !== verifiedPasswordHash) return null;
      const session = manager.create(AuthSession, {
        id: randomUUID(),
        userId,
        expiresAt: new Date(
          Date.now() + this.config.auth.sessionTtlSeconds * 1000,
        ),
        revokedAt: null,
      });
      await manager.save(session);
      return this.issue(manager, session);
    });
    if (!result) throw new UnauthorizedException('Invalid credentials');
    this.logger.log({ event: 'auth.session.created', userId });
    return result;
  }

  async refresh(rawToken: string): Promise<TokenResponseDto> {
    const tokenId = this.tokenId(rawToken);
    const repository = this.source.getRepository(RefreshToken);
    const reference = await repository.findOne({
      where: { id: tokenId },
      relations: { session: true },
    });
    if (!reference) throw new UnauthorizedException('Invalid refresh token');
    const result = await this.source.transaction(async (manager) => {
      // Always lock user -> session -> token; password changes use user -> sessions.
      const user = await manager.getRepository(User).findOne({
        where: { id: reference.session.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return null;
      const session = await manager.getRepository(AuthSession).findOne({
        where: { id: reference.sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now()
      )
        return null;
      const token = await manager.getRepository(RefreshToken).findOne({
        where: { id: tokenId },
        select: { id: true, tokenHash: true, usedAt: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!token || !this.matches(rawToken, token.tokenHash)) return null;
      if (token.usedAt) {
        await manager.update(AuthSession, session.id, {
          revokedAt: new Date(),
        });
        // Return, rather than throw, so revocation commits before the 401 response.
        return 'reused' as const;
      }
      await manager.update(RefreshToken, token.id, { usedAt: new Date() });
      return this.issue(manager, session);
    });
    if (!result || result === 'reused') {
      this.logger.warn({
        event:
          result === 'reused' ? 'auth.refresh.reused' : 'auth.refresh.rejected',
        userId: reference.session.userId,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
    this.logger.log({
      event: 'auth.refresh.rotated',
      userId: reference.session.userId,
    });
    return result;
  }

  async isActive(payload: AccessTokenPayload): Promise<boolean> {
    const session = await this.source.getRepository(AuthSession).findOne({
      where: { id: payload.sid, userId: payload.sub, revokedAt: IsNull() },
    });
    return !!session && session.expiresAt.getTime() > Date.now();
  }

  async logout(sessionId: string, userId: number): Promise<void> {
    await this.source
      .getRepository(AuthSession)
      .update(
        { id: sessionId, userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    this.logger.log({ event: 'auth.session.revoked', userId });
  }

  private async issue(
    manager: EntityManager,
    session: AuthSession,
  ): Promise<TokenResponseDto> {
    const id = randomUUID();
    const refreshToken = `${id}.${randomBytes(32).toString('base64url')}`;
    await manager.save(
      RefreshToken,
      manager.create(RefreshToken, {
        id,
        sessionId: session.id,
        tokenHash: this.digest(refreshToken),
        usedAt: null,
      }),
    );
    const expiresIn = Math.min(
      this.config.auth.accessTtlSeconds,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );
    if (expiresIn < 1) throw new UnauthorizedException('Session expired');
    const accessToken = this.jwt.sign(
      { sub: session.userId, sid: session.id, type: 'access' },
      {
        algorithm: 'HS256',
        issuer: this.config.auth.issuer,
        audience: this.config.auth.audience,
        expiresIn,
        jwtid: randomUUID(),
      },
    );
    return { accessToken, refreshToken, expiresIn };
  }

  private tokenId(raw: string): string {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/.test(
        raw,
      )
    )
      throw new UnauthorizedException('Invalid refresh token');
    return raw.split('.')[0];
  }
  private digest(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
  private matches(raw: string, digest: string): boolean {
    return (
      /^[a-f0-9]{64}$/.test(digest) &&
      timingSafeEqual(
        Buffer.from(this.digest(raw), 'hex'),
        Buffer.from(digest, 'hex'),
      )
    );
  }
}
