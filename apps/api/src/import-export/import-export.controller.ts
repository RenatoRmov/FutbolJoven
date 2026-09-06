import { Body, Controller, Get, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { PERMISSIONS } from "@futboljoven/shared";
import type { ImportRowResult } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ImportExportService } from "./import-export.service";
import type { AuthenticatedUser } from "../auth/auth.types";

function sendXlsx(res: Response, buffer: Buffer, filename: string) {
  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  res.send(buffer);
}

@Controller()
export class ImportExportController {
  constructor(private importExportService: ImportExportService) {}

  @RequirePermission(PERMISSIONS.DATA_IMPORT)
  @Get("import/players/template")
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.importExportService.buildTemplate();
    sendXlsx(res, buffer, "plantilla_jugadores.xlsx");
  }

  @RequirePermission(PERMISSIONS.DATA_IMPORT)
  @Post("import/players/preview")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.importExportService.preview(file.buffer);
  }

  @RequirePermission(PERMISSIONS.DATA_IMPORT)
  @Post("import/players/confirm")
  confirm(@CurrentUser() user: AuthenticatedUser, @Body("rows") rows: ImportRowResult[]) {
    return this.importExportService.confirm(user, rows);
  }

  @RequirePermission(PERMISSIONS.DATA_EXPORT)
  @Get("export/players")
  async exportPlayers(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query("teamId") teamId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("status") status?: string,
    @Query("full") full?: string,
  ) {
    const filters = { teamId, categoryId, status };
    const buffer =
      full === "true"
        ? await this.importExportService.exportPlayersFull(user, filters)
        : await this.importExportService.exportPlayers(user, filters);
    sendXlsx(res, buffer, "jugadores.xlsx");
  }

  @RequirePermission(PERMISSIONS.DATA_EXPORT)
  @Get("export/evaluations")
  async exportEvaluations(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query("teamId") teamId?: string,
    @Query("playerId") playerId?: string,
  ) {
    const buffer = await this.importExportService.exportEvaluations(user, { teamId, playerId });
    sendXlsx(res, buffer, "evaluaciones.xlsx");
  }
}
