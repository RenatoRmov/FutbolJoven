import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { createPlayerSchema, PERMISSIONS, updatePlayerSchema } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PlayersService } from "./players.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("players")
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @RequirePermission(PERMISSIONS.PLAYERS_VIEW_ALL, PERMISSIONS.PLAYERS_VIEW_ASSIGNED)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("teamId") teamId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("seasonId") seasonId?: string,
    @Query("status") status?: string,
    @Query("position") position?: string,
    @Query("search") search?: string,
  ) {
    return this.playersService.findAll(user, { teamId, categoryId, seasonId, status, position, search });
  }

  @RequirePermission(PERMISSIONS.PLAYERS_VIEW_ALL, PERMISSIONS.PLAYERS_VIEW_ASSIGNED)
  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.playersService.findOne(user, id);
  }

  @RequirePermission(PERMISSIONS.PLAYERS_CREATE)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createPlayerSchema)) body: any) {
    return this.playersService.create(user, body);
  }

  @RequirePermission(PERMISSIONS.PLAYERS_EDIT_ALL, PERMISSIONS.PLAYERS_EDIT_ASSIGNED)
  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodValidationPipe(updatePlayerSchema)) body: any) {
    return this.playersService.update(user, id, body);
  }

  @RequirePermission(PERMISSIONS.PLAYERS_DELETE)
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.playersService.remove(user, id);
  }
}
