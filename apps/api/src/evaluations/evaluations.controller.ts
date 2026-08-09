import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { createEvaluationSchema, PERMISSIONS, quickEvaluationEntrySchema } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { EvaluationsService } from "./evaluations.service";
import { EvaluationsConfigService } from "./evaluations-config.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("evaluations")
export class EvaluationsController {
  constructor(
    private evaluationsService: EvaluationsService,
    private configService: EvaluationsConfigService,
  ) {}

  @Get("config")
  getConfig() {
    return this.configService.getConfig();
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_CONFIG_MANAGE)
  @Post("config/dimensions")
  createDimension(@Body() body: { key: string; name: string; order: number; scaleId: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.configService.createDimension(body, user.id);
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_CONFIG_MANAGE)
  @Post("config/dimensions/:id/metrics")
  createMetric(@Param("id") id: string, @Body() body: { name: string; order: number }, @CurrentUser() user: AuthenticatedUser) {
    return this.configService.createMetric(id, body, user.id);
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_CREATE_ALL, PERMISSIONS.EVALUATIONS_CREATE_ASSIGNED)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createEvaluationSchema)) body: any) {
    return this.evaluationsService.create(user, body);
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_CREATE_ALL, PERMISSIONS.EVALUATIONS_CREATE_ASSIGNED)
  @Post("quick")
  createQuick(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(quickEvaluationEntrySchema)) body: any) {
    return this.evaluationsService.createQuickBatch(user, body);
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED)
  @Get("player/:playerId")
  findForPlayer(@CurrentUser() user: AuthenticatedUser, @Param("playerId") playerId: string) {
    return this.evaluationsService.findForPlayer(user, playerId);
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED)
  @Get("player/:playerId/evolution")
  getPlayerEvolution(@CurrentUser() user: AuthenticatedUser, @Param("playerId") playerId: string) {
    return this.evaluationsService.getPlayerEvolution(user, playerId);
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED)
  @Get("team/:teamId")
  findForTeam(@CurrentUser() user: AuthenticatedUser, @Param("teamId") teamId: string, @Query("date") date?: string) {
    return this.evaluationsService.findForTeam(user, teamId, date);
  }
}
