import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateInventoryItemDto, UpdateInventoryItemDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(categoryId?: string) {
    return this.prisma.inventoryItem.findMany({
      where: categoryId ? { OR: [{ categoryId }, { categoryId: null }] } : {},
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ itemType: "asc" }, { name: "asc" }],
    });
  }

  async create(user: AuthenticatedUser, dto: CreateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.create({
      data: dto,
      include: { category: { select: { id: true, name: true } } },
    });
    await this.audit.record({ userId: user.id, action: "CREATE", entityType: "InventoryItem", entityId: item.id, newValue: item });
    return item;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateInventoryItemDto) {
    const before = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Ítem de inventario no encontrado");

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true } } },
    });
    await this.audit.record({ userId: user.id, action: "UPDATE", entityType: "InventoryItem", entityId: id, oldValue: before, newValue: item });
    return item;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const before = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Ítem de inventario no encontrado");

    await this.prisma.inventoryItem.delete({ where: { id } });
    await this.audit.record({ userId: user.id, action: "DELETE", entityType: "InventoryItem", entityId: id, oldValue: before });
    return { deleted: true };
  }
}
