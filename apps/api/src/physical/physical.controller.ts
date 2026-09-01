import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { createInjurySchema, createPhysicalRecordSchema, PERMISSIONS, updateInjurySchema } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PhysicalService } from "./physical.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller()
export class PhysicalController {
  constructor(private physicalService: PhysicalService) {}

  @RequirePermission(PERMISSIONS.PHYSICAL_VIEW)
  @Get("physical/player/:playerId")
  findRecords(@Param("playerId") playerId: string) {
    return this.physicalService.findRecordsForPlayer(playerId);
  }

  @RequirePermission(PERMISSIONS.PHYSICAL_MANAGE)
  @Post("physical")
  createRecord(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createPhysicalRecordSchema)) body: any) {
    return this.physicalService.createRecord(user.id, body);
  }

  @RequirePermission(PERMISSIONS.PHYSICAL_VIEW)
  @Get("physical/medical-status")
  getMedicalStatusList() {
    return this.physicalService.getMedicalStatusList();
  }

  @RequirePermission(PERMISSIONS.PHYSICAL_VIEW)
  @Get("injuries/player/:playerId")
  findInjuries(@Param("playerId") playerId: string) {
    return this.physicalService.findInjuriesForPlayer(playerId);
  }

  @RequirePermission(PERMISSIONS.PHYSICAL_MANAGE)
  @Post("injuries")
  createInjury(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createInjurySchema)) body: any) {
    return this.physicalService.createInjury(user.id, body);
  }

  @RequirePermission(PERMISSIONS.PHYSICAL_MANAGE)
  @Patch("injuries/:id")
  updateInjury(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodValidationPipe(updateInjurySchema)) body: any) {
    return this.physicalService.updateInjury(user.id, id, body);
  }
}
