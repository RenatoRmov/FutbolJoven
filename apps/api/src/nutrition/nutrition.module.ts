import { Module } from "@nestjs/common";
import { NutritionService } from "./nutrition.service";
import { NutritionController } from "./nutrition.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [NutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
