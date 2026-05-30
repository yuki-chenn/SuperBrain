import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface AuditLogInput {
  actorUserId?: string;
  actorUsername?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorUsername: input.actorUsername,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        metadata: input.metadata ?? {},
        ipAddress: input.ipAddress,
      },
    });
  }

  async list(query: {
    action?: string;
    resourceType?: string;
    actorUserId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 30, 100);

    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.actorUserId) where.actorUserId = query.actorUserId;

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        actorUserId: item.actorUserId,
        actorUsername: item.actorUsername,
        action: item.action,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        before: item.before,
        after: item.after,
        metadata: item.metadata,
        ipAddress: item.ipAddress,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getOne(id: string) {
    const log = await this.prisma.adminAuditLog.findUnique({ where: { id } });
    if (!log) return null;
    return {
      ...log,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
