import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { createInventoryItemSchema, PERMISSIONS, updateInventoryItemSchema } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { InventoryService } from "./inventory.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("inventory")
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @RequirePermission(PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE)
  @Get()
  findAll(@Query("categoryId") categoryId?: string) {
    return this.inventoryService.findAll(categoryId);
  }

  @RequirePermission(PERMISSIONS.INVENTORY_MANAGE)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createInventoryItemSchema)) body: any) {
    return this.inventoryService.create(user, body);
  }

  @RequirePermission(PERMISSIONS.INVENTORY_MANAGE)
  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodValidationPipe(updateInventoryItemSchema)) body: any) {
    return this.inventoryService.update(user, id, body);
  }

  @RequirePermission(PERMISSIONS.INVENTORY_MANAGE)
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inventoryService.remove(user, id);
  }
}
