import { Module } from "@nestjs/common";
import { PlayerDocumentsService } from "./player-documents.service";
import { PlayerDocumentsController } from "./player-documents.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [PlayerDocumentsController],
  providers: [PlayerDocumentsService],
})
export class PlayerDocumentsModule {}
