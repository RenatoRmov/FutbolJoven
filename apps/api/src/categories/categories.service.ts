import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateCategoryDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { order: "asc" },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Categoría no encontrada");
    return category;
  }

  async create(dto: CreateCategoryDto, userId: string) {
    const category = await this.prisma.category.create({ data: dto });
    await this.audit.record({ userId, action: "CREATE", entityType: "Category", entityId: category.id, newValue: category });
    return category;
  }

  async update(id: string, dto: Partial<CreateCategoryDto>, userId: string) {
    const before = await this.findOne(id);
    const category = await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit.record({ userId, action: "UPDATE", entityType: "Category", entityId: id, oldValue: before, newValue: category });
    return category;
  }

  async remove(id: string, userId: string) {
    const before = await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    await this.audit.record({ userId, action: "DELETE", entityType: "Category", entityId: id, oldValue: before });
    return { message: "Categoría eliminada" };
  }
}
