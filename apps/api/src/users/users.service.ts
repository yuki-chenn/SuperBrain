import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByEmailOrUsername(value: string) {
    const byEmail = await this.findByEmail(value);
    if (byEmail) return byEmail;
    return this.findByUsername(value);
  }

  create(input: { email: string; username: string; passwordHash: string; displayName?: string }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
        displayName: input.displayName ?? null,
      },
    });
  }

  updateLastLoginAt(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async assignRoleByKey(userId: string, roleKey: string, assignedByUserId?: string) {
    const role = await this.prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) throw new Error(`Role not found: ${roleKey}`);
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id, assignedByUserId },
    });
  }

  async revokeRoleByKey(userId: string, roleKey: string) {
    const role = await this.prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) return null;
    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId: role.id } },
    }).catch(() => null);
  }

  async listRolesForUser(userId: string) {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      key: r.role.key,
      name: r.role.name,
      isSystem: r.role.isSystem,
      assignedAt: r.createdAt,
      assignedByUserId: r.assignedByUserId,
    }));
  }
}
