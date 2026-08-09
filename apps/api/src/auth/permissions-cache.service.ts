import { Injectable } from "@nestjs/common";
import type { PermissionKey } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";

interface CacheEntry {
  permissions: PermissionKey[];
  expiresAt: number;
}

const TTL_MS = 30_000;

/**
 * Roles/permissions are DB rows an admin can edit at runtime, so the JWT
 * never carries permissions directly (they'd go stale until the token
 * expires). This cache just avoids hitting the DB on every single request
 * for the common case of unchanged roles.
 */
@Injectable()
export class PermissionsCacheService {
  private cache = new Map<string, CacheEntry>();

  constructor(private prisma: PrismaService) {}

  async getPermissionsForRole(roleId: string): Promise<PermissionKey[]> {
    const cached = this.cache.get(roleId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    const permissions = rolePermissions.map((rp) => rp.permission.key as PermissionKey);
    this.cache.set(roleId, { permissions, expiresAt: Date.now() + TTL_MS });
    return permissions;
  }

  invalidate(roleId?: string) {
    if (roleId) {
      this.cache.delete(roleId);
    } else {
      this.cache.clear();
    }
  }
}
