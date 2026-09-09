import { Injectable } from "@nestjs/common";
import { computeNotaFinalForType, computeTalentStatus, PERMISSIONS, TALENT_STATUS_LABELS } from "@futboljoven/shared";
import type { TalentStatus } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";

const RECENT_DAYS = 30;

interface PlayerNotaFinalPoint {
  date: Date;
  value: number;
}

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

    const [
      activePlayers,
      totalCategories,
      totalTeams,
      evaluationsRecent,
      evaluationsTotal,
      allActivePlayerIds,
      evaluatedRecentPlayerIds,
      measurements,
    ] = await Promise.all([
      this.prisma.player.count({ where: { status: "ACTIVE" } }),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.team.count(),
      this.prisma.evaluation.count({ where: { date: { gte: cutoff } } }),
      this.prisma.evaluation.count(),
      this.prisma.player.findMany({ where: { status: "ACTIVE" }, select: { id: true } }),
      this.prisma.evaluation.findMany({ where: { date: { gte: cutoff } }, select: { playerId: true }, distinct: ["playerId"] }),
      this.computeMeasurementStats(),
    ]);

    const evaluatedSet = new Set(evaluatedRecentPlayerIds.map((e) => e.playerId));
    const playersWithoutRecentEvaluation = allActivePlayerIds.filter((p) => !evaluatedSet.has(p.id)).length;

    const players = await this.prisma.player.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentTeam: { select: { category: { select: { id: true, name: true, order: true } } } },
      },
    });

    const stats = await this.computeNotaFinalStats(players.map((p) => p.id));

    const categoryBuckets = new Map<string, { name: string; order: number; values: number[] }>();
    const estatusCounts = new Map<TalentStatus, number>();
    const improving: { playerId: string; name: string; delta: number; notaFinal: number }[] = [];
    const declining: { playerId: string; name: string; delta: number; notaFinal: number }[] = [];
    const trendBuckets = new Map<string, number[]>();

    for (const player of players) {
      const points = stats.pointsByPlayer.get(player.id) ?? [];
      for (const p of points) {
        const weekKey = weekStartISO(p.date);
        const arr = trendBuckets.get(weekKey) ?? [];
        arr.push(p.value);
        trendBuckets.set(weekKey, arr);
      }
      if (points.length === 0) continue;

      const latest = points[points.length - 1].value;
      const category = player.currentTeam?.category;
      if (category) {
        const bucket = categoryBuckets.get(category.id) ?? { name: category.name, order: category.order, values: [] };
        bucket.values.push(latest);
        categoryBuckets.set(category.id, bucket);
      }

      const status = computeTalentStatus(latest);
      if (status) estatusCounts.set(status, (estatusCounts.get(status) ?? 0) + 1);

      if (points.length >= 2) {
        const delta = Number((latest - points[0].value).toFixed(2));
        const entry = { playerId: player.id, name: `${player.firstName} ${player.lastName}`, delta, notaFinal: latest };
        if (delta >= 0.5) improving.push(entry);
        else if (delta <= -0.5) declining.push(entry);
      }
    }

    const notaFinalByCategory = Array.from(categoryBuckets.values())
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ categoryName: c.name, avgNotaFinal: average(c.values), playerCount: c.values.length }));

    const estatusDistribution = (Object.keys(TALENT_STATUS_LABELS) as TalentStatus[]).map((status) => ({
      status,
      label: TALENT_STATUS_LABELS[status],
      count: estatusCounts.get(status) ?? 0,
    }));

    const notaFinalTrend = Array.from(trendBuckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-12)
      .map(([week, values]) => ({ week, avgNotaFinal: average(values) }));

    return {
      scope: "global" as const,
      kpis: {
        activePlayers,
        totalCategories,
        totalTeams,
        evaluationsLast30Days: evaluationsRecent,
        evaluationsTotal,
        playersWithoutRecentEvaluation,
        playersImproving: improving.length,
        playersDeclining: declining.length,
        avgHeight: measurements.avgHeight,
        avgBmi: measurements.avgBmi,
        aptitud: measurements.aptitud,
      },
      notaFinalByCategory,
      estatusDistribution,
      notaFinalTrend,
      topImproving: improving.sort((a, b) => b.delta - a.delta).slice(0, 5),
      topDeclining: declining.sort((a, b) => a.delta - b.delta).slice(0, 5),
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

    const stats = await this.computeNotaFinalStats(players.map((p) => p.id));
    const estatusCounts = new Map<TalentStatus, number>();
    for (const player of players) {
      const points = stats.pointsByPlayer.get(player.id) ?? [];
      if (points.length === 0) continue;
      const status = computeTalentStatus(points[points.length - 1].value);
      if (status) estatusCounts.set(status, (estatusCounts.get(status) ?? 0) + 1);
    }
    const estatusDistribution = (Object.keys(TALENT_STATUS_LABELS) as TalentStatus[]).map((status) => ({
      status,
      label: TALENT_STATUS_LABELS[status],
      count: estatusCounts.get(status) ?? 0,
    }));

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
      estatusDistribution,
    };
  }

  /**
   * Fetches every evaluation for the given players once, and computes the
   * weighted Nota Final for each (using the dimension weights currently
   * configured). Bounded to demo/mid-size datasets — for large clubs this
   * should move to a scheduled aggregation job.
   */
  /**
   * "Promedio de mediciones y nutrición" — deliberately kept to two concrete,
   * comparable figures: average height (from Player.height) and average BMI
   * from each player's most recent Evaluación Antropométrica (Área Médica,
   * PhysicalRecord.recordType = ANTHROPOMETRIC). BMI must come from this
   * specific source — not Nutrición nor Revisión de Peso — since it's the
   * one staff actually keeps current. Aptitud is derived from each player's
   * most recent Injury: no active/recovering injury -> apto;
   * RECOVERING -> enReintegro; ACTIVE -> noApto.
   */
  private async computeMeasurementStats() {
    const [players, latestAnthro, latestInjuries] = await Promise.all([
      this.prisma.player.findMany({ where: { status: "ACTIVE" }, select: { id: true, height: true } }),
      this.prisma.physicalRecord.findMany({
        where: { recordType: "ANTHROPOMETRIC", player: { status: "ACTIVE" } },
        select: { playerId: true, date: true, metrics: true },
        orderBy: { date: "desc" },
      }),
      this.prisma.injury.findMany({
        where: { player: { status: "ACTIVE" } },
        select: { playerId: true, date: true, status: true },
        orderBy: { date: "desc" },
      }),
    ]);

    const heights = players.map((p) => p.height).filter((h): h is number => h !== null);
    const avgHeight = average(heights);

    const latestAnthroByPlayer = new Map<string, { weight: number | null; height: number | null }>();
    for (const record of latestAnthro) {
      if (latestAnthroByPlayer.has(record.playerId)) continue;
      const metrics = JSON.parse(record.metrics) as Record<string, string | number>;
      const weight = metrics.weight !== undefined ? Number(metrics.weight) : null;
      const height = metrics.height !== undefined ? Number(metrics.height) : null;
      latestAnthroByPlayer.set(record.playerId, { weight, height });
    }
    const bmis: number[] = [];
    for (const { weight, height } of latestAnthroByPlayer.values()) {
      if (weight === null || height === null || !weight || !height) continue;
      const heightMeters = height / 100;
      bmis.push(weight / (heightMeters * heightMeters));
    }
    const avgBmi = average(bmis);

    const latestInjuryByPlayer = new Map<string, string>();
    for (const injury of latestInjuries) {
      if (!latestInjuryByPlayer.has(injury.playerId)) latestInjuryByPlayer.set(injury.playerId, injury.status);
    }
    let apto = 0;
    let noApto = 0;
    let enReintegro = 0;
    for (const player of players) {
      const status = latestInjuryByPlayer.get(player.id);
      if (status === "ACTIVE") noApto++;
      else if (status === "RECOVERING") enReintegro++;
      else apto++;
    }

    return { avgHeight, avgBmi, aptitud: { apto, noApto, enReintegro } };
  }

  private async computeNotaFinalStats(playerIds: string[]) {
    const dimensions = await this.prisma.evaluationDimension.findMany({ where: { isActive: true } });
    const weightByDimension = new Map(dimensions.map((d) => [d.id, d.weight]));
    const keyByDimension = new Map(dimensions.map((d) => [d.id, d.key]));

    const evaluations = await this.prisma.evaluation.findMany({
      where: { playerId: { in: playerIds } },
      select: { playerId: true, date: true, type: true, scores: { select: { dimensionId: true, value: true } } },
      orderBy: { date: "asc" },
    });

    const pointsByPlayer = new Map<string, PlayerNotaFinalPoint[]>();
    for (const ev of evaluations) {
      const byDimension = new Map<string, number[]>();
      for (const s of ev.scores) {
        const arr = byDimension.get(s.dimensionId) ?? [];
        arr.push(s.value);
        byDimension.set(s.dimensionId, arr);
      }
      const dimensionAverages = Array.from(byDimension.entries()).map(([dimensionId, values]) => ({
        dimensionId,
        key: keyByDimension.get(dimensionId) ?? "",
        weight: weightByDimension.get(dimensionId) ?? 0,
        average: values.reduce((a, b) => a + b, 0) / values.length,
      }));
      const notaFinal = computeNotaFinalForType(dimensionAverages, ev.type);
      if (notaFinal === null) continue;
      const arr = pointsByPlayer.get(ev.playerId) ?? [];
      arr.push({ date: ev.date, value: notaFinal });
      pointsByPlayer.set(ev.playerId, arr);
    }

    return { pointsByPlayer };
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function weekStartISO(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start of week
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}
