import { Module } from "@nestjs/common";
import { ImportExportService } from "./import-export.service";
import { ImportExportController } from "./import-export.controller";
import { PlayersModule } from "../players/players.module";

@Module({
  imports: [PlayersModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
})
export class ImportExportModule {}
