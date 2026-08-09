import { Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import type { CreateEvaluationDto, QuickEvaluationEntryDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { assertTeamInScope, resolveTeamScope } from "../common/scope.util";
import type { AuthenticatedUser } from "../auth/auth.types";

const evaluationInclude = {
  scores: { include: { dimension: true, metric: true } },
  evaluator: { select: { firstName: true, lastName: true } },
};

@Injectable()
export class EvaluationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateEvaluationDto) {
    assertTeamInScope(user, dto.teamId, PERMISSIONS.EVALUATIONS_CREATE_ALL, PERMISSIONS.EVALUATIONS_CREATE_ASSIGNED);
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) throw new NotFoundException("Equipo no encontrado");

    const evaluation = await this.prisma.evaluation.create({
      data: {
        playerId: dto.playerId,
        teamId: dto.teamId,
        seasonId: team.seasonId,
        evaluatorId: user.id,
        date: dto.date,
        type: dto.type,
        context: dto.context ?? null,
        observation: dto.observation ?? null,
        scores: {
          create: dto.scores.map((s) => ({
            dimensionId: s.dimensionId,
            metricId: s.metricId ?? null,
            value: s.value,
            comment: s.comment ?? null,
          })),
        },
      },
      include: evaluationInclude,
    });

    await this.audit.record({ userId: user.id, action: "CREATE", entityType: "Evaluation", entityId: evaluation.id, newValue: evaluation });
    return evaluation;
  }

  async createQuickBatch(user: AuthenticatedUser, dto: QuickEvaluationEntryDto) {
    assertTeamInScope(user, dto.teamId, PERMISSIONS.EVALUATIONS_CREATE_ALL, PERMISSIONS.EVALUATIONS_CREATE_ASSIGNED);
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) throw new NotFoundException("Equipo no encontrado");

    const created = await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.evaluation.create({
          data: {
            playerId: entry.playerId,
            teamId: dto.teamId,
            seasonId: team.seasonId,
            evaluatorId: user.id,
            date: dto.date,
            type: dto.type,
            context: dto.context ?? null,
            observation: entry.observation ?? null,
            scores: {
              create: entry.scores.map((s) => ({
                dimensionId: s.dimensionId,
                metricId: s.metricId ?? null,
                value: s.value,
                comment: s.comment ?? null,
              })),
            },
          },
        }),
      ),
    );

    await this.audit.record({
      userId: user.id,
      action: "CREATE_BATCH",
      entityType: "Evaluation",
      entityId: dto.teamId,
      newValue: { count: created.length, date: dto.date },
    });

    return { created: created.length };
  }

  async findForPlayer(user: AuthenticatedUser, playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");
    if (player.currentTeamId) {
      assertTeamInScope(user, player.currentTeamId, PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED);
    } else if (!user.permissions.includes(PERMISSIONS.EVALUATIONS_VIEW_ALL)) {
      return [];
    }

    return this.prisma.evaluation.findMany({
      where: { playerId },
      include: evaluationInclude,
      orderBy: { date: "desc" },
    });
  }

  async findForTeam(user: AuthenticatedUser, teamId: string, date?: string) {
    assertTeamInScope(user, teamId, PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED);
    return this.prisma.evaluation.findMany({
      where: { teamId, ...(date ? { date: new Date(date) } : {}) },
      include: evaluationInclude,
      orderBy: { date: "desc" },
    });
  }

  /**
   * Time series per dimension + current/previous averages + the player's
   * current team average, for the radar/evolution charts on the player
   * profile. Averaging is done in application code (not SQL) since the
   * evaluation count per player is small (dozens, not millions).
   */
  async getPlayerEvolution(user: AuthenticatedUser, playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");
    if (player.currentTeamId) {
      assertTeamInScope(user, player.currentTeamId, PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED);
    } else if (!user.permissions.includes(PERMISSIONS.EVALUATIONS_VIEW_ALL)) {
      return { series: [], radar: [], previousRadar: [], teamAverageRadar: [] };
    }

    const dimensions = await this.prisma.evaluationDimension.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    const evaluations = await this.prisma.evaluation.findMany({
      where: { playerId },
      include: { scores: true },
      orderBy: { date: "asc" },
    });

    const series = dimensions.map((dim) => ({
      dimensionId: dim.id,
      dimensionKey: dim.key,
      dimensionName: dim.name,
      points: evaluations
        .map((ev) => {
          const scores = ev.scores.filter((s) => s.dimensionId === dim.id);
          if (scores.length === 0) return null;
          const avg = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;
          return { date: ev.date, value: Number(avg.toFixed(2)) };
        })
        .filter((p): p is { date: Date; value: number } => p !== null),
    }));

    const radar = series.map((s) => ({
      dimensionKey: s.dimensionKey,
      dimensionName: s.dimensionName,
      value: s.points.length ? s.points[s.points.length - 1].value : null,
    }));

    const previousRadar = series.map((s) => ({
      dimensionKey: s.dimensionKey,
      dimensionName: s.dimensionName,
      value: s.points.length > 1 ? s.points[s.points.length - 2].value : null,
    }));

    const teamAverageRadar = player.currentTeamId ? await this.getTeamAverages(player.currentTeamId, dimensions) : [];

    return { series, radar, previousRadar, teamAverageRadar };
  }

  private async getTeamAverages(teamId: string, dimensions: { id: string; key: string; name: string }[]) {
    const players = await this.prisma.player.findMany({ where: { currentTeamId: teamId }, select: { id: true } });
    const playerIds = players.map((p) => p.id);
    if (playerIds.length === 0) return dimensions.map((d) => ({ dimensionKey: d.key, dimensionName: d.name, value: null }));

    const evaluations = await this.prisma.evaluation.findMany({
      where: { playerId: { in: playerIds } },
      include: { scores: true },
      orderBy: { date: "asc" },
    });

    // Latest evaluation per player.
    const latestByPlayer = new Map<string, (typeof evaluations)[number]>();
    for (const ev of evaluations) {
      latestByPlayer.set(ev.playerId, ev);
    }

    return dimensions.map((dim) => {
      const values: number[] = [];
      for (const ev of latestByPlayer.values()) {
        const scores = ev.scores.filter((s) => s.dimensionId === dim.id);
        if (scores.length) values.push(scores.reduce((sum, s) => sum + s.value, 0) / scores.length);
      }
      const value = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;
      return { dimensionKey: dim.key, dimensionName: dim.name, value };
    });
  }
}
