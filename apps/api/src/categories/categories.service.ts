import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateCategoryDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Same scoping rationale as TeamsService.findAll — a user restricted to
   * specific teams (a coach) only sees the categories those teams belong
   * to, so category filters/menus built from this endpoint never dangle
   * links to categories they have no actual access to.
   */
  async findAll(user: AuthenticatedUser, includeInactive = false) {
    if (user.teamIds.length > 0) {
      const teams = await this.prisma.team.findMany({ where: { id: { in: user.teamIds } }, select: { categoryId: true } });
      const categoryIds = [...new Set(teams.map((t) => t.categoryId))];
      return this.prisma.category.findMany({
        where: { id: { in: categoryIds }, ...(includeInactive ? {} : { isActive: true }) },
        orderBy: { order: "asc" },
      });
    }
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
