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
  ],
})
export class AppModule {}
