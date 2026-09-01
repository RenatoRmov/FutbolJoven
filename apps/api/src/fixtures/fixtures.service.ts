import { Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import type { CreateMatchDto, RecordMatchResultDto, UpdateMatchDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { assertTeamInScope, resolveTeamScope } from "../common/scope.util";
import type { AuthenticatedUser } from "../auth/auth.types";

const matchInclude = {
  team: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
  appearances: { include: { player: { select: { id: true, firstName: true, lastName: true } } } },
};

@Injectable()
export class FixturesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findForTeam(user: AuthenticatedUser, teamId: string) {
    assertTeamInScope(user, teamId, PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED);
    return this.prisma.match.findMany({ where: { teamId }, include: matchInclude, orderBy: { date: "asc" } });
  }

  async findAll(user: AuthenticatedUser) {
    const scope = resolveTeamScope(user, PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED);
    return this.prisma.match.findMany({
      where: scope.teamIdIn ? { teamId: { in: scope.teamIdIn } } : {},
      include: matchInclude,
      orderBy: { date: "asc" },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const match = await this.prisma.match.findUnique({ where: { id }, include: matchInclude });
    if (!match) throw new NotFoundException("Partido no encontrado");
    assertTeamInScope(user, match.teamId, PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED);
    return match;
  }

  async create(user: AuthenticatedUser, dto: CreateMatchDto) {
    assertTeamInScope(user, dto.teamId, PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED);
    const match = await this.prisma.match.create({ data: dto, include: matchInclude });
    await this.audit.record({ userId: user.id, action: "CREATE", entityType: "Match", entityId: match.id, newValue: match });
    return match;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateMatchDto) {
    const before = await this.prisma.match.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Partido no encontrado");
    assertTeamInScope(user, before.teamId, PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED);

    const match = await this.prisma.match.update({ where: { id }, data: dto, include: matchInclude });
    await this.audit.record({ userId: user.id, action: "UPDATE", entityType: "Match", entityId: id, oldValue: before, newValue: match });
    return match;
  }

  /** Closes a match: records the result and every player's appearance in one transaction. */
  async recordResult(user: AuthenticatedUser, id: string, dto: RecordMatchResultDto) {
    const before = await this.prisma.match.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Partido no encontrado");
    assertTeamInScope(user, before.teamId, PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED);

    const match = await this.prisma.$transaction(async (tx) => {
      await tx.matchAppearance.deleteMany({ where: { matchId: id } });
      await tx.match.update({
        where: { id },
        data: { status: "PLAYED", teamScore: dto.teamScore, opponentScore: dto.opponentScore },
      });
      await tx.matchAppearance.createMany({
        data: dto.appearances.map((a) => ({
          matchId: id,
          playerId: a.playerId,
          started: a.started,
          minutesPlayed: a.minutesPlayed ?? null,
          goals: a.goals,
          yellowCards: a.yellowCards,
          redCard: a.redCard,
          notes: a.notes ?? null,
        })),
      });
      return tx.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
    });

    await this.audit.record({
      userId: user.id,
      action: "RECORD_RESULT",
      entityType: "Match",
      entityId: id,
      newValue: { teamScore: dto.teamScore, opponentScore: dto.opponentScore, appearances: dto.appearances.length },
    });
    return match;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const before = await this.prisma.match.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Partido no encontrado");
    assertTeamInScope(user, before.teamId, PERMISSIONS.FIXTURES_MANAGE_ALL, PERMISSIONS.FIXTURES_MANAGE_ASSIGNED);

    await this.prisma.match.delete({ where: { id } });
    await this.audit.record({ userId: user.id, action: "DELETE", entityType: "Match", entityId: id, oldValue: before });
    return { deleted: true };
  }

  /** "Minutos y Partidos" tab — this player's appearances across all matches. */
  async findAppearancesForPlayer(user: AuthenticatedUser, playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");
    if (player.currentTeamId) {
      assertTeamInScope(user, player.currentTeamId, PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED);
    } else if (!user.permissions.includes(PERMISSIONS.FIXTURES_VIEW_ALL)) {
      return [];
    }

    return this.prisma.matchAppearance.findMany({
      where: { playerId },
      include: { match: { select: { id: true, opponent: true, date: true, isHome: true, teamScore: true, opponentScore: true, status: true } } },
      orderBy: { match: { date: "desc" } },
    });
  }
}
