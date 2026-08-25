import { Module } from "@nestjs/common";
import { PhysicalService } from "./physical.service";
import { PhysicalController } from "./physical.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [PhysicalController],
  providers: [PhysicalService],
})
export class PhysicalModule {}
