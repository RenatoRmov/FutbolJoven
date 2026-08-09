import { Controller, Get, Query } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private auditService: AuditService) {}

  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  @Get()
  list(@Query("entityType") entityType?: string, @Query("entityId") entityId?: string, @Query("skip") skip?: string) {
    return this.auditService.list({ entityType, entityId, skip: skip ? Number(skip) : 0 });
  }
}
