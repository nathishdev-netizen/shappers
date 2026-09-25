import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterTenantDto } from './dto/register-tenant.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { subdomain: dto.subdomain } });
    if (existing) throw new ConflictException('Subdomain already taken');

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.gymName,
        subdomain: dto.subdomain,
        users: {
          create: {
            email: dto.ownerEmail,
            passwordHash,
            firstName: dto.ownerFirstName,
            lastName: dto.ownerLastName,
            role: StaffRole.OWNER,
          },
        },
      },
      include: { users: true },
    });

    const owner = tenant.users[0];
    return this.issueTokens({
      userId: owner.id,
      tenantId: tenant.id,
      role: owner.role,
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName,
    });
  }

  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain: dto.subdomain } });
    if (!tenant) throw new UnauthorizedException('Invalid credentials');

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  private issueTokens(payload: { userId: string; tenantId: string; role: string; email: string; firstName: string; lastName: string }) {
    const accessToken = this.jwt.sign(payload);
    return { accessToken, user: payload };
  }
}
