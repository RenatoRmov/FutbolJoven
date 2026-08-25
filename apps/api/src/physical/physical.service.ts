import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreatePhysicalRecordDto, CreateInjuryDto, UpdateInjuryDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class PhysicalService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findRecordsForPlayer(playerId: string) {
    const records = await this.prisma.physicalRecord.findMany({
      where: { playerId },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });
    return records.map((r) => ({ ...r, metrics: JSON.parse(r.metrics) as Record<string, string | number> }));
  }

  async createRecord(userId: string, dto: CreatePhysicalRecordDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    const record = await this.prisma.physicalRecord.create({
      data: {
        playerId: dto.playerId,
        date: dto.date,
        metrics: JSON.stringify(dto.metrics),
        observations: dto.observations ?? null,
        recordedById: userId,
      },
    });
    await this.audit.record({ userId, action: "CREATE", entityType: "PhysicalRecord", entityId: record.id, newValue: record });
    return { ...record, metrics: dto.metrics };
  }

  async findInjuriesForPlayer(playerId: string) {
    return this.prisma.injury.findMany({ where: { playerId }, orderBy: { date: "desc" } });
  }

  async createInjury(userId: string, dto: CreateInjuryDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    const { playerId, ...rest } = dto;
    const injury = await this.prisma.injury.create({
      data: { ...rest, playerId, recordedById: userId },
    });
    await this.audit.record({ userId, action: "CREATE", entityType: "Injury", entityId: injury.id, newValue: injury });
    return injury;
  }

  async updateInjury(userId: string, id: string, dto: UpdateInjuryDto) {
    const before = await this.prisma.injury.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Registro de lesión no encontrado");

    const injury = await this.prisma.injury.update({ where: { id }, data: dto });
    await this.audit.record({ userId, action: "UPDATE", entityType: "Injury", entityId: id, oldValue: before, newValue: injury });
    return injury;
  }
}
