import { Module } from "@nestjs/common";
import { FixturesService } from "./fixtures.service";
import { FixturesController } from "./fixtures.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [FixturesController],
  providers: [FixturesService],
  exports: [FixturesService],
})
export class FixturesModule {}
