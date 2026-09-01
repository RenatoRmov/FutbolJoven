import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { EvaluationsModule } from "../evaluations/evaluations.module";

@Module({
  imports: [EvaluationsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
