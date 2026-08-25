import { Injectable, NotFoundException } from "@nestjs/common";
import type { UpsertPlayerDocumentDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class PlayerDocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  listDocumentTypes() {
    return this.prisma.documentType.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { order: "asc" }] });
  }

  async findForPlayer(playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    const [documentTypes, playerDocuments] = await Promise.all([
      this.prisma.documentType.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { order: "asc" }] }),
      this.prisma.playerDocument.findMany({ where: { playerId } }),
    ]);

    const byTypeId = new Map(playerDocuments.map((d) => [d.documentTypeId, d]));

    return documentTypes.map((type) => ({
      documentType: type,
      document: byTypeId.get(type.id) ?? null,
    }));
  }

  async upsert(userId: string, playerId: string, dto: UpsertPlayerDocumentDto) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    const existing = await this.prisma.playerDocument.findUnique({
      where: { playerId_documentTypeId: { playerId, documentTypeId: dto.documentTypeId } },
    });

    const document = await this.prisma.playerDocument.upsert({
      where: { playerId_documentTypeId: { playerId, documentTypeId: dto.documentTypeId } },
      update: {
        status: dto.status,
        submittedDate: dto.submittedDate ?? null,
        expiresDate: dto.expiresDate ?? null,
        notes: dto.notes ?? null,
      },
      create: {
        playerId,
        documentTypeId: dto.documentTypeId,
        status: dto.status,
        submittedDate: dto.submittedDate ?? null,
        expiresDate: dto.expiresDate ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.audit.record({
      userId,
      action: existing ? "UPDATE" : "CREATE",
      entityType: "PlayerDocument",
      entityId: document.id,
      oldValue: existing,
      newValue: document,
    });
    return document;
  }
}
