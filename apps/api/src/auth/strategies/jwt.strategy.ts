import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'dev-secret'),
    });
  }

  /**
   * A well-signed token is not enough: the user and tenant it names must still
   * exist and be active. Without this check a token minted before the database
   * was reset stays "valid", every tenant-scoped query matches nothing, and the
   * client renders an empty club instead of sending the user back to sign in.
   */
  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.userId, tenantId: payload.tenantId, isActive: true },
      select: { id: true, tenant: { select: { id: true } } },
    });

    if (!user?.tenant) throw new UnauthorizedException('Session is no longer valid');

    return payload;
  }
}
