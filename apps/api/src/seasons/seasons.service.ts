import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSeasonDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class SeasonsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.season.findMany({ orderBy: { startDate: "desc" } });
  }

  async findOne(id: string) {
    const season = await this.prisma.season.findUnique({ where: { id } });
    if (!season) throw new NotFoundException("Temporada no encontrada");
    return season;
  }

  async create(dto: CreateSeasonDto, userId: string) {
    let club = await this.prisma.club.findFirst();
    if (!club) {
      club = await this.prisma.club.create({ data: { name: "Club" } });
    }
    if (dto.isActive) {
      await this.prisma.season.updateMany({ data: { isActive: false }, where: { isActive: true } });
    }
    const season = await this.prisma.season.create({
      data: { ...dto, clubId: club.id },
    });
    await this.audit.record({ userId, action: "CREATE", entityType: "Season", entityId: season.id, newValue: season });
    return season;
  }

  async update(id: string, dto: Partial<CreateSeasonDto>, userId: string) {
    const before = await this.findOne(id);
    if (dto.isActive) {
      await this.prisma.season.updateMany({ data: { isActive: false }, where: { isActive: true } });
    }
    const season = await this.prisma.season.update({ where: { id }, data: dto });
    await this.audit.record({ userId, action: "UPDATE", entityType: "Season", entityId: id, oldValue: before, newValue: season });
    return season;
  }

  async remove(id: string, userId: string) {
    const before = await this.findOne(id);
    await this.prisma.season.delete({ where: { id } });
    await this.audit.record({ userId, action: "DELETE", entityType: "Season", entityId: id, oldValue: before });
    return { message: "Temporada eliminada" };
  }
}
