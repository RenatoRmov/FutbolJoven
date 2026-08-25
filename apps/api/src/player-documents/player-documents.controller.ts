import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { PERMISSIONS, upsertPlayerDocumentSchema } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PlayerDocumentsService } from "./player-documents.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller()
export class PlayerDocumentsController {
  constructor(private playerDocumentsService: PlayerDocumentsService) {}

  @RequirePermission(PERMISSIONS.PLAYERS_DOCUMENTS_VIEW, PERMISSIONS.PLAYERS_DOCUMENTS_MANAGE)
  @Get("document-types")
  listDocumentTypes() {
    return this.playerDocumentsService.listDocumentTypes();
  }

  @RequirePermission(PERMISSIONS.PLAYERS_DOCUMENTS_VIEW, PERMISSIONS.PLAYERS_DOCUMENTS_MANAGE)
  @Get("players/:playerId/documents")
  findForPlayer(@Param("playerId") playerId: string) {
    return this.playerDocumentsService.findForPlayer(playerId);
  }

  @RequirePermission(PERMISSIONS.PLAYERS_DOCUMENTS_MANAGE)
  @Put("players/:playerId/documents")
  upsert(@CurrentUser() user: AuthenticatedUser, @Param("playerId") playerId: string, @Body(new ZodValidationPipe(upsertPlayerDocumentSchema)) body: any) {
    return this.playerDocumentsService.upsert(user.id, playerId, body);
  }
}
