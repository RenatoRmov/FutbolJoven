import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { createCategorySchema, PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CategoriesService } from "./categories.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("categories")
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.categoriesService.findAll(includeInactive === "true");
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @RequirePermission(PERMISSIONS.CATEGORIES_MANAGE)
  @Post()
  create(@Body(new ZodValidationPipe(createCategorySchema)) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.create(body, user.id);
  }

  @RequirePermission(PERMISSIONS.CATEGORIES_MANAGE)
  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(createCategorySchema.partial())) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.update(id, body, user.id);
  }

  @RequirePermission(PERMISSIONS.CATEGORIES_MANAGE)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.remove(id, user.id);
  }
}
