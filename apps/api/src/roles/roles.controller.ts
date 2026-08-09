import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RolesService } from "./roles.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("roles")
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @RequirePermission(PERMISSIONS.ROLES_MANAGE)
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @RequirePermission(PERMISSIONS.ROLES_MANAGE)
  @Get("permissions")
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @RequirePermission(PERMISSIONS.ROLES_MANAGE)
  @Post()
  create(@Body() body: { key: string; name: string; permissionIds: string[] }, @CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.create(body, user.id);
  }

  @RequirePermission(PERMISSIONS.ROLES_MANAGE)
  @Put(":id/permissions")
  updatePermissions(@Param("id") id: string, @Body() body: { permissionIds: string[] }, @CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.updatePermissions(id, body.permissionIds, user.id);
  }

  @RequirePermission(PERMISSIONS.ROLES_MANAGE)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.remove(id, user.id);
  }
}
