import { Injectable, NotFoundException } from "@nestjs/common";
import { computeNotaFinal, computeTalentStatus, PERMISSIONS, TALENT_STATUS_LABELS } from "@futboljoven/shared";
import type { TalentStatus } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { assertTeamInScope } from "../common/scope.util";
import type { AuthenticatedUser } from "../auth/auth.types";
import { addHeader, addSignatureBlock, COLORS, drawBar, ensureSpace, fullWidthText, renderPdfToBuffer, sectionTitle, STATUS_COLORS } from "./pdf.util";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async buildPlayerReportPdf(user: AuthenticatedUser, playerId: string): Promise<Buffer> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { currentTeam: { include: { category: true } } },
    });
    if (!player) throw new NotFoundException("Jugador no encontrado");
    if (player.currentTeamId) {
      assertTeamInScope(user, player.currentTeamId, PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED);
    } else if (!user.permissions.includes(PERMISSIONS.EVALUATIONS_VIEW_ALL)) {
      throw new NotFoundException("Jugador no encontrado");
    }

    const [dimensions, evaluations, appearances, latestInjury] = await Promise.all([
      this.prisma.evaluationDimension.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      this.prisma.evaluation.findMany({
        where: { playerId },
        include: { scores: { include: { dimension: true } } },
        orderBy: { date: "desc" },
      }),
      this.prisma.matchAppearance.findMany({
        where: { playerId },
        include: { match: { select: { opponent: true, date: true, isHome: true, teamScore: true, opponentScore: true } } },
        orderBy: { match: { date: "desc" } },
      }),
      this.prisma.injury.findFirst({ where: { playerId }, orderBy: { date: "desc" } }),
    ]);

    const scoredEvaluations = evaluations.map((ev) => {
      const byDimension = new Map<string, { weight: number; values: number[] }>();
      for (const s of ev.scores) {
        const entry = byDimension.get(s.dimension.id) ?? { weight: s.dimension.weight, values: [] };
        entry.values.push(s.value);
        byDimension.set(s.dimension.id, entry);
      }
      const dimensionAverages = Array.from(byDimension.entries()).map(([dimensionId, { weight, values }]) => ({
        dimensionId,
        weight,
        average: values.reduce((a, b) => a + b, 0) / values.length,
      }));
      const notaFinal = computeNotaFinal(dimensionAverages);
      return { evaluation: ev, notaFinal, estatus: computeTalentStatus(notaFinal), byDimension };
    });

    const latest = scoredEvaluations[0] ?? null;
    const aptitud = !latestInjury || latestInjury.status === "CLEARED" ? "Apto" : latestInjury.status === "RECOVERING" ? "En reintegro" : "No apto";

    const totalMinutes = appearances.reduce((sum, a) => sum + (a.minutesPlayed ?? 0), 0);
    const totalGoals = appearances.reduce((sum, a) => sum + a.goals, 0);
    const totalYellow = appearances.reduce((sum, a) => sum + a.yellowCards, 0);
    const totalRed = appearances.reduce((sum, a) => sum + (a.redCard ? 1 : 0), 0);

    return renderPdfToBuffer((doc) => {
      addHeader(doc, `${player.firstName} ${player.lastName}`, "Ficha individual de jugador");

      const category = player.currentTeam?.category?.name ?? "Sin categoría";
      doc.fontSize(10).fillColor(COLORS.gris);
      fullWidthText(doc, `${category} · ${player.primaryPosition ?? "Sin posición"} · Dorsal ${player.jerseyNumber ?? "—"}`);
      doc.moveDown(0.8);

      sectionTitle(doc, "Estado general");
      doc.fontSize(10).fillColor(COLORS.carbon);
      fullWidthText(doc, `Nota Final: ${latest?.notaFinal ?? "—"}   Estatus: ${latest?.estatus ? TALENT_STATUS_LABELS[latest.estatus as TalentStatus] : "Sin evaluar"}   Aptitud médica: ${aptitud}`);
      doc.moveDown(0.5);

      if (latest) {
        sectionTitle(doc, "Desglose por dimensión (última evaluación)");
        for (const dim of dimensions) {
          const entry = latest.byDimension.get(dim.id);
          const avg = entry ? entry.values.reduce((a, b) => a + b, 0) / entry.values.length : null;
          drawBar(doc, dim.name, avg, 10);
        }
      }

      sectionTitle(doc, "Historial de Notas Técnicas");
      if (scoredEvaluations.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin evaluaciones registradas.");
      } else {
        for (const { evaluation, notaFinal, estatus } of scoredEvaluations.slice(0, 12)) {
          ensureSpace(doc, 14);
          doc.fontSize(9).fillColor(COLORS.carbon);
          fullWidthText(
            doc,
            `${new Date(evaluation.date).toLocaleDateString("es-CL")}  ·  ${evaluation.type}  ·  Nota Final ${notaFinal ?? "—"}  ·  ${estatus ? TALENT_STATUS_LABELS[estatus as TalentStatus] : "—"}`,
          );
        }
      }

      sectionTitle(doc, "Minutos y Partidos");
      doc.fontSize(9).fillColor(COLORS.carbon);
      fullWidthText(doc, `Total: ${totalMinutes} min · ${totalGoals} goles · ${totalYellow} amarillas · ${totalRed} rojas`);
      doc.moveDown(0.3);
      if (appearances.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin partidos registrados.");
      } else {
        for (const a of appearances.slice(0, 15)) {
          ensureSpace(doc, 14);
          const scoreLine = a.match.teamScore !== null ? ` (${a.match.teamScore}-${a.match.opponentScore})` : "";
          doc.fontSize(9).fillColor(COLORS.carbon);
          fullWidthText(
            doc,
            `${new Date(a.match.date).toLocaleDateString("es-CL")}  ·  ${a.match.isHome ? "vs" : "@"} ${a.match.opponent}${scoreLine}  ·  ${a.minutesPlayed ?? "—"} min  ·  ${a.goals} goles${a.yellowCards ? `  ·  ${a.yellowCards} amarilla(s)` : ""}${a.redCard ? "  ·  roja" : ""}`,
          );
        }
      }

      addSignatureBlock(doc);
    });
  }

  async buildTeamReportPdf(user: AuthenticatedUser, teamId: string): Promise<Buffer> {
    assertTeamInScope(user, teamId, PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED);
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: { category: true, season: true } });
    if (!team) throw new NotFoundException("Equipo no encontrado");

    const [players, dimensions] = await Promise.all([
      this.prisma.player.findMany({ where: { currentTeamId: teamId, status: "ACTIVE" } }),
      this.prisma.evaluationDimension.findMany({ where: { isActive: true } }),
    ]);
    const weightByDimension = new Map(dimensions.map((d) => [d.id, d.weight]));
    const playerIds = players.map((p) => p.id);

    const [evaluations, nutritionRecords, injuries, appearances] = await Promise.all([
      this.prisma.evaluation.findMany({ where: { playerId: { in: playerIds } }, include: { scores: true }, orderBy: { date: "desc" } }),
      this.prisma.nutritionRecord.findMany({ where: { playerId: { in: playerIds } }, orderBy: { date: "desc" } }),
      this.prisma.injury.findMany({ where: { playerId: { in: playerIds } }, orderBy: { date: "desc" } }),
      this.prisma.matchAppearance.findMany({ where: { playerId: { in: playerIds } } }),
    ]);

    const latestEvalByPlayer = new Map<string, (typeof evaluations)[number]>();
    for (const ev of evaluations) if (!latestEvalByPlayer.has(ev.playerId)) latestEvalByPlayer.set(ev.playerId, ev);
    const latestNutritionByPlayer = new Map<string, (typeof nutritionRecords)[number]>();
    for (const n of nutritionRecords) if (!latestNutritionByPlayer.has(n.playerId)) latestNutritionByPlayer.set(n.playerId, n);
    const latestInjuryByPlayer = new Map<string, (typeof injuries)[number]>();
    for (const inj of injuries) if (!latestInjuryByPlayer.has(inj.playerId)) latestInjuryByPlayer.set(inj.playerId, inj);
    const minutesByPlayer = new Map<string, number>();
    for (const a of appearances) minutesByPlayer.set(a.playerId, (minutesByPlayer.get(a.playerId) ?? 0) + (a.minutesPlayed ?? 0));

    const rows = players.map((p) => {
      const ev = latestEvalByPlayer.get(p.id);
      let notaFinal: number | null = null;
      let estatus: TalentStatus | null = null;
      if (ev) {
        const byDimension = new Map<string, number[]>();
        for (const s of ev.scores) {
          const arr = byDimension.get(s.dimensionId) ?? [];
          arr.push(s.value);
          byDimension.set(s.dimensionId, arr);
        }
        const dimensionAverages = Array.from(byDimension.entries()).map(([dimensionId, values]) => ({
          dimensionId,
          weight: weightByDimension.get(dimensionId) ?? 0,
          average: values.reduce((a, b) => a + b, 0) / values.length,
        }));
        notaFinal = computeNotaFinal(dimensionAverages);
        estatus = computeTalentStatus(notaFinal);
      }
      const nutrition = latestNutritionByPlayer.get(p.id);
      const bmi = nutrition?.weight && nutrition?.height ? nutrition.weight / (nutrition.height / 100) ** 2 : null;
      const injuryStatus = latestInjuryByPlayer.get(p.id)?.status;
      const aptitud = injuryStatus === "ACTIVE" ? "No apto" : injuryStatus === "RECOVERING" ? "En reintegro" : "Apto";

      return { name: `${p.firstName} ${p.lastName}`, notaFinal, estatus, bmi, aptitud, minutes: minutesByPlayer.get(p.id) ?? 0 };
    });

    const aptitudCounts = { apto: 0, enReintegro: 0, noApto: 0 };
    for (const r of rows) {
      if (r.aptitud === "Apto") aptitudCounts.apto++;
      else if (r.aptitud === "En reintegro") aptitudCounts.enReintegro++;
      else aptitudCounts.noApto++;
    }

    return renderPdfToBuffer((doc) => {
      addHeader(doc, `${team.category.name} — ${team.name}`, `Reporte de categoría · ${team.season.name}`);

      sectionTitle(doc, "Nota Final por jugador");
      if (rows.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin jugadores en este equipo.");
      } else {
        for (const r of rows) {
          drawBar(doc, r.name, r.notaFinal, 10, r.estatus ? (STATUS_COLORS[r.estatus] ?? COLORS.rojo) : COLORS.rojo);
        }
      }

      sectionTitle(doc, "Aptitud médica del plantel");
      doc.fontSize(9).fillColor(COLORS.carbon);
      fullWidthText(doc, `Aptos: ${aptitudCounts.apto}    En reintegro: ${aptitudCounts.enReintegro}    No aptos: ${aptitudCounts.noApto}`);

      sectionTitle(doc, "Detalle por jugador");
      for (const r of rows) {
        ensureSpace(doc, 14);
        doc.fontSize(9).fillColor(COLORS.carbon);
        fullWidthText(
          doc,
          `${r.name}  ·  Nota Final ${r.notaFinal ?? "—"}  ·  ${r.estatus ? TALENT_STATUS_LABELS[r.estatus] : "Sin evaluar"}  ·  IMC ${r.bmi ? r.bmi.toFixed(1) : "—"}  ·  ${r.minutes} min  ·  ${r.aptitud}`,
        );
      }

      addSignatureBlock(doc);
    });
  }
}
