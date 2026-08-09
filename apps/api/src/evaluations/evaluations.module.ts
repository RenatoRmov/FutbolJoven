import { Module } from "@nestjs/common";
import { EvaluationsService } from "./evaluations.service";
import { EvaluationsConfigService } from "./evaluations-config.service";
import { EvaluationsController } from "./evaluations.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, EvaluationsConfigService],
  exports: [EvaluationsService, EvaluationsConfigService],
})
export class EvaluationsModule {}
