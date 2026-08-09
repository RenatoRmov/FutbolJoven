import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (v instanceof Date ? v.toISOString() : v));
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async record(params: {
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue === undefined ? undefined : safeStringify(params.oldValue),
        newValue: params.newValue === undefined ? undefined : safeStringify(params.newValue),
      },
    });
  }

  async list(params: { entityType?: string; entityId?: string; take?: number; skip?: number }) {
    const where = {
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: params.take ?? 50,
        skip: params.skip ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        oldValue: item.oldValue ? JSON.parse(item.oldValue) : null,
        newValue: item.newValue ? JSON.parse(item.newValue) : null,
      })),
      total,
    };
  }
}
