import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { createMatchSchema, PERMISSIONS, recordMatchResultSchema, updateMatchSchema } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FixturesService } from "./fixtures.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("fixtures")
export class FixturesController {
  constructor(private fixturesService: FixturesService) {}

  @RequirePermission(PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.fixturesService.findAll(user);
  }

  @RequirePermission(PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED)
  @Get("team/:teamId")
  findForTeam(@CurrentUser() user: AuthenticatedUser, @Param("teamId") teamId: string) {
    return this.fixturesService.findForTeam(user, teamId);
  }

  @RequirePermission(PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED)
  @Get("player/:playerId/appearances")
  findAppearancesForPlayer(@CurrentUser() user: AuthenticatedUser, @Param("playerId") playerId: string) {
    return this.fixturesService.findAppearancesForPlayer(user, playerId);
  }

  @RequirePermission(PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED)
  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fixturesService.findOne(user, id);
  }

  @RequirePermission(PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createMatchSchema)) body: any) {
    return this.fixturesService.create(user, body);
  }

  @RequirePermission(PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED)
  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodValidationPipe(updateMatchSchema)) body: any) {
    return this.fixturesService.update(user, id, body);
  }

  @RequirePermission(PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED)
  @Post(":id/result")
  recordResult(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodValidationPipe(recordMatchResultSchema)) body: any) {
    return this.fixturesService.recordResult(user, id, body);
  }

  @RequirePermission(PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED)
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fixturesService.remove(user, id);
  }
}
