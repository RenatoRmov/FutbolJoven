import { Injectable } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";

const RECENT_DAYS = 30;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(user: AuthenticatedUser) {
    if (user.permissions.includes(PERMISSIONS.DASHBOARD_VIEW_GLOBAL)) {
      return this.getGlobalSummary();
    }
    return this.getAssignedSummary(user);
  }

  private async getGlobalSummary() {
    const cutoff = new Date(Date.now() - RECENT_DAYS * 86_400_000);

    const [activePlayers, totalCategories, totalTeams, evaluationsRecent, evaluationsTotal, allActivePlayerIds, evaluatedRecentPlayerIds] =
      await Promise.all([
        this.prisma.player.count({ where: { status: "ACTIVE" } }),
        this.prisma.category.count({ where: { isActive: true } }),
        this.prisma.team.count(),
        this.prisma.evaluation.count({ where: { date: { gte: cutoff } } }),
        this.prisma.evaluation.count(),
        this.prisma.player.findMany({ where: { status: "ACTIVE" }, select: { id: true } }),
        this.prisma.evaluation.findMany({ where: { date: { gte: cutoff } }, select: { playerId: true }, distinct: ["playerId"] }),
      ]);

    const evaluatedSet = new Set(evaluatedRecentPlayerIds.map((e) => e.playerId));
    const playersWithoutRecentEvaluation = allActivePlayerIds.filter((p) => !evaluatedSet.has(p.id)).length;

    const trend = await this.computeEvolutionTrend();

    return {
      scope: "global" as const,
      kpis: {
        activePlayers,
        totalCategories,
        totalTeams,
        evaluationsLast30Days: evaluationsRecent,
        evaluationsTotal,
        playersWithoutRecentEvaluation,
        playersImproving: trend.improving,
        playersDeclining: trend.declining,
      },
    };
  }

  private async getAssignedSummary(user: AuthenticatedUser) {
    const cutoff = new Date(Date.now() - RECENT_DAYS * 86_400_000);
    const teamIds = user.teamIds;

    const [teams, players, evaluatedRecentPlayerIds, recentEvaluations] = await Promise.all([
      this.prisma.team.findMany({ where: { id: { in: teamIds } }, include: { category: true, season: true } }),
      this.prisma.player.findMany({ where: { currentTeamId: { in: teamIds }, status: "ACTIVE" }, select: { id: true, firstName: true, lastName: true, currentTeamId: true } }),
      this.prisma.evaluation.findMany({ where: { teamId: { in: teamIds }, date: { gte: cutoff } }, select: { playerId: true }, distinct: ["playerId"] }),
      this.prisma.evaluation.findMany({
        where: { teamId: { in: teamIds } },
        orderBy: { date: "desc" },
        take: 10,
        include: { player: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const evaluatedSet = new Set(evaluatedRecentPlayerIds.map((e) => e.playerId));
    const playersPending = players.filter((p) => !evaluatedSet.has(p.id));

    return {
      scope: "assigned" as const,
      kpis: {
        myTeams: teams.length,
        myPlayers: players.length,
        playersPendingEvaluation: playersPending.length,
      },
      teams,
      playersPending,
      recentEvaluations,
    };
  }

  private async computeEvolutionTrend() {
    const dimensions = await this.prisma.evaluationDimension.findMany({ where: { isActive: true } });
    const players = await this.prisma.player.findMany({ where: { status: "ACTIVE" }, select: { id: true } });

    let improving = 0;
    let declining = 0;

    // Bounded to a reasonable demo/mid-size dataset; for large clubs this
    // aggregation should move to a scheduled job / materialized view.
    for (const player of players) {
      const evaluations = await this.prisma.evaluation.findMany({
        where: { playerId: player.id },
        include: { scores: true },
        orderBy: { date: "asc" },
      });
      if (evaluations.length < 2) continue;

      const avgFor = (ev: (typeof evaluations)[number]) => {
        if (ev.scores.length === 0) return null;
        return ev.scores.reduce((sum, s) => sum + s.value, 0) / ev.scores.length;
      };

      const first = avgFor(evaluations[0]);
      const last = avgFor(evaluations[evaluations.length - 1]);
      if (first === null || last === null) continue;

      const delta = last - first;
      if (delta >= 0.5) improving += 1;
      else if (delta <= -0.5) declining += 1;
    }

    return { improving, declining };
  }
}
