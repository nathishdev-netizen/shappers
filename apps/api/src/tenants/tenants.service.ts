import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateBrandingDto } from './dto/update-branding.dto.js';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  /** Staff directory — used for trainer assignment and, later, staff management. */
  listStaff(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });
  }

  async updateBranding(tenantId: string, dto: UpdateBrandingDto) {
    const tenant = await this.findById(tenantId);
    const colors = {
      ...(tenant.colors as Record<string, string> | null),
      ...(dto.primaryColor ? { primary: dto.primaryColor } : {}),
      ...(dto.secondaryColor ? { secondary: dto.secondaryColor } : {}),
    };

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.logoUrl ? { logoUrl: dto.logoUrl } : {}),
        colors,
      },
    });
  }
}
