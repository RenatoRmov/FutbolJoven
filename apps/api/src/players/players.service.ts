import { Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import type { CreatePlayerDto, UpdatePlayerDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { assertTeamInScope, resolveTeamScope } from "../common/scope.util";
import type { AuthenticatedUser } from "../auth/auth.types";

const playerInclude = {
  currentTeam: { include: { category: true, season: true } },
  secondaryPositions: true,
};

export interface PlayerFilters {
  teamId?: string;
  categoryId?: string;
  seasonId?: string;
  status?: string;
  position?: string;
  search?: string;
}

@Injectable()
export class PlayersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, filters: PlayerFilters) {
    const scope = resolveTeamScope(user, PERMISSIONS.PLAYERS_VIEW_ALL, PERMISSIONS.PLAYERS_VIEW_ASSIGNED);

    const where: Record<string, unknown> = {};
    if (scope.teamIdIn) where.currentTeamId = { in: scope.teamIdIn };
    if (filters.teamId) where.currentTeamId = filters.teamId;
    if (filters.status) where.status = filters.status;
    if (filters.position) where.primaryPosition = filters.position;
    if (filters.categoryId || filters.seasonId) {
      where.currentTeam = {
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      };
    }
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { sportName: { contains: filters.search } },
      ];
    }

    return this.prisma.player.findMany({
      where,
      include: playerInclude,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: {
        ...playerInclude,
        teamHistory: { include: { team: { include: { category: true, season: true } } }, orderBy: { startDate: "asc" } },
      },
    });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    if (player.currentTeamId) {
      assertTeamInScope(user, player.currentTeamId, PERMISSIONS.PLAYERS_VIEW_ALL, PERMISSIONS.PLAYERS_VIEW_ASSIGNED);
    } else if (!user.permissions.includes(PERMISSIONS.PLAYERS_VIEW_ALL)) {
      throw new NotFoundException("Jugador no encontrado");
    }

    return player;
  }

  async create(user: AuthenticatedUser, dto: CreatePlayerDto) {
    if (dto.teamId) {
      assertTeamInScope(user, dto.teamId, PERMISSIONS.PLAYERS_EDIT_ALL, PERMISSIONS.PLAYERS_EDIT_ASSIGNED);
    }

    const { teamId, secondaryPositions, ...rest } = dto;
    const player = await this.prisma.player.create({
      data: {
        ...rest,
        currentTeamId: teamId ?? null,
        secondaryPositions: secondaryPositions?.length
          ? { create: secondaryPositions.map((position) => ({ position })) }
          : undefined,
        teamHistory: teamId ? { create: { teamId, startDate: dto.joinDate } } : undefined,
      },
      include: playerInclude,
    });

    await this.audit.record({ userId: user.id, action: "CREATE", entityType: "Player", entityId: player.id, newValue: player });
    return player;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdatePlayerDto) {
    const before = await this.findOne(user, id);
    assertTeamInScope(user, before.currentTeamId ?? "__none__", PERMISSIONS.PLAYERS_EDIT_ALL, PERMISSIONS.PLAYERS_EDIT_ASSIGNED);

    const { teamId, secondaryPositions, ...rest } = dto;
    const teamChanged = teamId !== undefined && teamId !== before.currentTeamId;

    if (teamChanged && teamId) {
      assertTeamInScope(user, teamId, PERMISSIONS.PLAYERS_EDIT_ALL, PERMISSIONS.PLAYERS_EDIT_ASSIGNED);
    }

    if (secondaryPositions !== undefined) {
      await this.prisma.playerSecondaryPosition.deleteMany({ where: { playerId: id } });
    }

    const player = await this.prisma.player.update({
      where: { id },
      data: {
        ...rest,
        ...(teamId !== undefined ? { currentTeamId: teamId } : {}),
        secondaryPositions: secondaryPositions?.length
          ? { create: secondaryPositions.map((position) => ({ position })) }
          : undefined,
      },
      include: playerInclude,
    });

    if (teamChanged) {
      await this.prisma.playerTeamHistory.updateMany({
        where: { playerId: id, endDate: null },
        data: { endDate: new Date() },
      });
      if (teamId) {
        await this.prisma.playerTeamHistory.create({ data: { playerId: id, teamId, startDate: new Date() } });
      }
    }

    await this.audit.record({ userId: user.id, action: "UPDATE", entityType: "Player", entityId: id, oldValue: before, newValue: player });
    return player;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const before = await this.findOne(user, id);
    const player = await this.prisma.player.update({
      where: { id },
      data: { status: "LEFT_CLUB", exitDate: new Date() },
    });
    await this.audit.record({ userId: user.id, action: "DEACTIVATE", entityType: "Player", entityId: id, oldValue: before, newValue: player });
    return player;
  }
}
