import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { SeasonsModule } from "./seasons/seasons.module";
import { CategoriesModule } from "./categories/categories.module";
import { TeamsModule } from "./teams/teams.module";
import { RolesModule } from "./roles/roles.module";
import { UsersModule } from "./users/users.module";
import { PlayersModule } from "./players/players.module";
import { EvaluationsModule } from "./evaluations/evaluations.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { NutritionModule } from "./nutrition/nutrition.module";
import { PhysicalModule } from "./physical/physical.module";
import { PlayerDocumentsModule } from "./player-documents/player-documents.module";
import { ImportExportModule } from "./import-export/import-export.module";
import { FixturesModule } from "./fixtures/fixtures.module";
import { FinanceModule } from "./finance/finance.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    SeasonsModule,
    CategoriesModule,
    TeamsModule,
    RolesModule,
    UsersModule,
    PlayersModule,
    EvaluationsModule,
    DashboardModule,
    NutritionModule,
    PhysicalModule,
    PlayerDocumentsModule,
    ImportExportModule,
    FixturesModule,
    FinanceModule,
    ReportsModule,
  ],
})
export class AppModule {}
