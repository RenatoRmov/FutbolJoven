import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateNutritionRecordDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class NutritionService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findForPlayer(playerId: string) {
    return this.prisma.nutritionRecord.findMany({
      where: { playerId },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });
  }

  async create(userId: string, dto: CreateNutritionRecordDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    const { playerId, ...rest } = dto;
    const record = await this.prisma.nutritionRecord.create({
      data: { ...rest, playerId, recordedById: userId },
    });

    await this.audit.record({ userId, action: "CREATE", entityType: "NutritionRecord", entityId: record.id, newValue: record });
    return record;
  }
}
