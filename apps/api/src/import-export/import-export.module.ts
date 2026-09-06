import { Module } from "@nestjs/common";
import { ImportExportService } from "./import-export.service";
import { ImportExportController } from "./import-export.controller";
import { PlayersModule } from "../players/players.module";
import { EvaluationsModule } from "../evaluations/evaluations.module";

@Module({
  imports: [PlayersModule, EvaluationsModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
})
export class ImportExportModule {}
