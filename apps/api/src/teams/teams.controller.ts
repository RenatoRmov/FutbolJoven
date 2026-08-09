import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { createTeamSchema, PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { TeamsService } from "./teams.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("teams")
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  findAll(@Query("seasonId") seasonId?: string) {
    return this.teamsService.findAll(seasonId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.teamsService.findOne(id);
  }

  @RequirePermission(PERMISSIONS.TEAMS_MANAGE)
  @Post()
  create(@Body(new ZodValidationPipe(createTeamSchema)) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.create(body, user.id);
  }

  @RequirePermission(PERMISSIONS.TEAMS_MANAGE)
  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(createTeamSchema.partial())) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.update(id, body, user.id);
  }

  @RequirePermission(PERMISSIONS.TEAMS_MANAGE)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.remove(id, user.id);
  }
}
