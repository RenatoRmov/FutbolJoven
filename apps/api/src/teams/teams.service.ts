import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateTeamDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll(seasonId?: string) {
    return this.prisma.team.findMany({
      where: seasonId ? { seasonId } : undefined,
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
