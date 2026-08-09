import { Module } from "@nestjs/common";
import { SeasonsService } from "./seasons.service";
import { SeasonsController } from "./seasons.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [SeasonsController],
  providers: [SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
