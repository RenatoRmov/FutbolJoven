import { Controller, Get } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { DashboardService } from "./dashboard.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("dashboard")
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @RequirePermission(PERMISSIONS.DASHBOARD_VIEW_GLOBAL, PERMISSIONS.DASHBOARD_VIEW_ASSIGNED)
  @Get("summary")
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSummary(user);
  }
}
