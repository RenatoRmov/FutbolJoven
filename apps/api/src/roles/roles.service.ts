import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PermissionsCacheService } from "../auth/permissions-cache.service";

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private permissionsCache: PermissionsCacheService,
  ) {}

  findAll() {
    return this.prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: "asc" } });
  }

  async create(dto: { key: string; name: string; permissionIds: string[] }, userId: string) {
    const role = await this.prisma.role.create({
      data: {
        key: dto.key,
        name: dto.name,
        isSystem: false,
        rolePermissions: { create: dto.permissionIds.map((permissionId) => ({ permissionId })) },
      },
    });
    await this.audit.record({ userId, action: "CREATE", entityType: "Role", entityId: role.id, newValue: role });
    return role;
  }

  async updatePermissions(id: string, permissionIds: string[], userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException("Rol no encontrado");

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
    });
    this.permissionsCache.invalidate(id);

    await this.audit.record({ userId, action: "UPDATE_PERMISSIONS", entityType: "Role", entityId: id, newValue: { permissionIds } });
    return this.prisma.role.findUnique({ where: { id }, include: { rolePermissions: { include: { permission: true } } } });
  }

  async remove(id: string, userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException("Rol no encontrado");
    if (role.isSystem) throw new BadRequestException("No se pueden eliminar los roles del sistema");
    await this.prisma.role.delete({ where: { id } });
    await this.audit.record({ userId, action: "DELETE", entityType: "Role", entityId: id, oldValue: role });
    return { message: "Rol eliminado" };
  }
}
