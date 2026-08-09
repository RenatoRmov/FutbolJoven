import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { createSeasonSchema, PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SeasonsService } from "./seasons.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("seasons")
export class SeasonsController {
  constructor(private seasonsService: SeasonsService) {}

  @Get()
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.seasonsService.findOne(id);
  }

  @RequirePermission(PERMISSIONS.SEASONS_MANAGE)
  @Post()
  create(@Body(new ZodValidationPipe(createSeasonSchema)) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.seasonsService.create(body, user.id);
  }

  @RequirePermission(PERMISSIONS.SEASONS_MANAGE)
  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(createSeasonSchema.partial())) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.seasonsService.update(id, body, user.id);
  }

  @RequirePermission(PERMISSIONS.SEASONS_MANAGE)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.seasonsService.remove(id, user.id);
  }
}
