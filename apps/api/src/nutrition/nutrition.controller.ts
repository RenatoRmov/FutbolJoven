import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { createNutritionRecordSchema, PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { NutritionService } from "./nutrition.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("nutrition")
export class NutritionController {
  constructor(private nutritionService: NutritionService) {}

  @RequirePermission(PERMISSIONS.NUTRITION_VIEW)
  @Get("player/:playerId")
  findForPlayer(@Param("playerId") playerId: string) {
    return this.nutritionService.findForPlayer(playerId);
  }

  @RequirePermission(PERMISSIONS.NUTRITION_MANAGE)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createNutritionRecordSchema)) body: any) {
    return this.nutritionService.create(user.id, body);
  }
}
