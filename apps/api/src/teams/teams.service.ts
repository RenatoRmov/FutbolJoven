import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateTeamDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * A user with team assignments (typically a coach responsible for only
   * some categories) only sees those teams here — otherwise every list,
   * filter and navigation menu built from this endpoint shows every
   * category in the club regardless of what they can actually do with it.
   * A user with no assignments (admin/director/coordinator personas) sees
   * every team, same as before.
   */
  findAll(user: AuthenticatedUser, seasonId?: string) {
    const scoped = user.teamIds.length > 0 ? { id: { in: user.teamIds } } : {};
    return this.prisma.team.findMany({
      where: { ...scoped, ...(seasonId ? { seasonId } : {}) },
      include: { category: true, season: true, _count: { select: { players: true } } },
      orderBy: [{ season: { startDate: "desc" } }, { category: { order: "asc" } }],
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { category: true, season: true, _count: { select: { players: true } } },
    });
    if (!team) throw new NotFoundException("Equipo no encontrado");
    return team;
  }

  async create(dto: CreateTeamDto, userId: string) {
    const team = await this.prisma.team.create({ data: dto });
    await this.audit.record({ userId, action: "CREATE", entityType: "Team", entityId: team.id, newValue: team });
    return team;
  }

  async update(id: string, dto: Partial<CreateTeamDto>, userId: string) {
    const before = await this.findOne(id);
    const team = await this.prisma.team.update({ where: { id }, data: dto });
    await this.audit.record({ userId, action: "UPDATE", entityType: "Team", entityId: id, oldValue: before, newValue: team });
    return team;
  }

  async remove(id: string, userId: string) {
    const before = await this.findOne(id);
    await this.prisma.team.delete({ where: { id } });
    await this.audit.record({ userId, action: "DELETE", entityType: "Team", entityId: id, oldValue: before });
    return { message: "Equipo eliminado" };
  }
}
