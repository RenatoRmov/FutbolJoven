import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ReportsService } from "./reports.service";
import type { AuthenticatedUser } from "../auth/auth.types";

function sendPdf(res: Response, buffer: Buffer, filename: string) {
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  res.send(buffer);
}

@Controller("reports")
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @RequirePermission(PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED)
  @Get("players/:id/pdf")
  async playerPdf(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() res: Response) {
    const buffer = await this.reportsService.buildPlayerReportPdf(user, id);
    sendPdf(res, buffer, `ficha-jugador-${id}.pdf`);
  }

  @RequirePermission(PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED)
  @Get("teams/:id/pdf")
  async teamPdf(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() res: Response) {
    const buffer = await this.reportsService.buildTeamReportPdf(user, id);
    sendPdf(res, buffer, `reporte-equipo-${id}.pdf`);
  }
}
