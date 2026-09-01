import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { createFinancialEntrySchema, PERMISSIONS } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FinanceService } from "./finance.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("finance")
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @RequirePermission(PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_MANAGE)
  @Get()
  findAll() {
    return this.financeService.findAll();
  }

  @RequirePermission(PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_MANAGE)
  @Get("summary")
  getSummary() {
    return this.financeService.getSummary();
  }

  @RequirePermission(PERMISSIONS.FINANCE_MANAGE)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createFinancialEntrySchema)) body: any) {
    return this.financeService.create(user, body);
  }

  @RequirePermission(PERMISSIONS.FINANCE_MANAGE)
  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.financeService.remove(user, id);
  }
}
