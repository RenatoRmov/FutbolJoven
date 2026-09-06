import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { EvaluationsModule } from "../evaluations/evaluations.module";
import { FinanceModule } from "../finance/finance.module";

@Module({
  imports: [EvaluationsModule, FinanceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
