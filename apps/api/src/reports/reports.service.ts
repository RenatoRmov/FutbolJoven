import { Injectable, NotFoundException } from "@nestjs/common";
import { computeNotaFinalForType, computeTalentStatus, MATCH_STATUS_LABELS, PERMISSIONS, PLAYER_POSITION_LABELS, TALENT_STATUS_LABELS } from "@futboljoven/shared";
import type { TalentStatus } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { assertTeamInScope } from "../common/scope.util";
import { EvaluationsService } from "../evaluations/evaluations.service";
import { FinanceService } from "../finance/finance.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import {
  addHeader,
  addSignatureBlock,
  COLORS,
  columnSectionTitle,
  columnText,
  drawBar,
  drawMiniTable,
  drawRadarChart,
  drawStatCard,
  drawTable,
  ensureSpace,
  formatDate,
  fullWidthText,
  renderPdfToBuffer,
  sectionTitle,
  STATUS_COLORS,
} from "./pdf.util";
import type { RadarAxis } from "./pdf.util";

const PAGE_MARGIN = 40;
const PAGE_CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;

function formatCLP(value: number): string {
  return value.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private evaluationsService: EvaluationsService,
    private financeService: FinanceService,
  ) {}

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

    const [evaluations, appearances, injuries, evolution, anthroRecords] = await Promise.all([
      this.prisma.evaluation.findMany({
        where: { playerId },
        include: { scores: { include: { dimension: true } }, evaluator: { select: { firstName: true, lastName: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.matchAppearance.findMany({
        where: { playerId },
        include: { match: { select: { opponent: true, date: true, isHome: true, teamScore: true, opponentScore: true } } },
        orderBy: { match: { date: "desc" } },
      }),
      this.prisma.injury.findMany({ where: { playerId }, orderBy: { date: "desc" } }),
      this.evaluationsService.getPlayerEvolution(user, playerId),
      this.prisma.physicalRecord.findMany({
        where: { playerId, recordType: "ANTHROPOMETRIC" },
        include: { recordedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { date: "desc" },
        take: 3,
      }),
    ]);
    const latestInjury = injuries[0] ?? null;
    const latestMatch = appearances[0] ?? null;
    const latestObservation = evaluations.find((ev) => ev.observation)?.observation ?? player.notes ?? null;

    const radarAxesMatch: RadarAxis[] = evolution.match.radar.map((r, i) => ({
      label: r.dimensionName,
      current: r.value,
      previous: evolution.match.previousRadar[i]?.value ?? null,
      teamAverage: evolution.match.teamAverageRadar[i]?.value ?? null,
    }));
    const radarAxesTraining: RadarAxis[] = evolution.training.radar.map((r, i) => ({
      label: r.dimensionName,
      current: r.value,
      previous: evolution.training.previousRadar[i]?.value ?? null,
      teamAverage: evolution.training.teamAverageRadar[i]?.value ?? null,
    }));

    const aptitud = !latestInjury || latestInjury.status === "CLEARED" ? "Apto" : latestInjury.status === "RECOVERING" ? "En reintegro" : "No apto";
    const totalMinutes = appearances.reduce((sum, a) => sum + (a.minutesPlayed ?? 0), 0);
    const totalGoals = appearances.reduce((sum, a) => sum + a.goals, 0);
    const totalYellow = appearances.reduce((sum, a) => sum + a.yellowCards, 0);
    const totalRed = appearances.reduce((sum, a) => sum + (a.redCard ? 1 : 0), 0);

    const anthro = anthroRecords.map((r) => {
      const metrics = JSON.parse(r.metrics) as Record<string, number>;
      const imc = metrics.weight && metrics.height ? Number((metrics.weight / (metrics.height / 100) ** 2).toFixed(1)) : null;
      const clasificacion = imc === null ? "—" : imc < 18.5 ? "Riesgo de desnutrición" : imc < 25 ? "Normal" : imc < 30 ? "Sobrepeso" : "Obesidad";
      return { date: r.date, metrics, imc, clasificacion, recordedBy: r.recordedBy };
    });
    const latestAnthro = anthro[0] ?? null;

    const colGap = 20;
    const colWidth = (PAGE_CONTENT_WIDTH - colGap) / 2;
    const leftX = PAGE_MARGIN;
    const rightX = PAGE_MARGIN + colWidth + colGap;

    return renderPdfToBuffer((doc) => {
      // ---- Página 1: resumen del jugador ----
      addHeader(doc, `${player.firstName} ${player.lastName}`, "Ficha individual de jugador");

      const category = player.currentTeam?.category?.name ?? "Sin categoría";
      const positionLabel = player.primaryPosition ? PLAYER_POSITION_LABELS[player.primaryPosition as keyof typeof PLAYER_POSITION_LABELS] ?? player.primaryPosition : "Sin posición";
      doc.fontSize(10).fillColor(COLORS.gris);
      fullWidthText(doc, `${category} · ${positionLabel} · Dorsal ${player.jerseyNumber ?? "—"}`);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor(COLORS.carbon).font("Helvetica-Bold");
      fullWidthText(
        doc,
        `Nota Final (Partido): ${evolution.match.notaFinal ?? "—"}   ·   Estatus: ${evolution.match.estatus ? TALENT_STATUS_LABELS[evolution.match.estatus as TalentStatus] : "Sin evaluar"}   ·   Aptitud médica: ${aptitud}`,
      );
      doc.font("Helvetica");
      doc.moveDown(0.6);

      const col1Top = doc.y;
      let leftY = col1Top;
      let rightY = col1Top;

      const radarSize = 150;
      const radarTopPad = 18; // deja lugar a la etiqueta del eje superior del radar, que si no se solapa con el título de la sección
      leftY = columnSectionTitle(doc, "Radar de Habilidades — Partido", leftX, leftY, colWidth);
      leftY = drawRadarChart(doc, radarAxesMatch, { size: radarSize, centerX: leftX + colWidth / 2, topY: leftY + radarTopPad }) + 10;
      leftY = columnSectionTitle(doc, "Radar de Habilidades — Entrenamiento", leftX, leftY, colWidth);
      leftY = drawRadarChart(doc, radarAxesTraining, { size: radarSize, centerX: leftX + colWidth / 2, topY: leftY + radarTopPad }) + 10;

      rightY = columnSectionTitle(
        doc,
        `Evaluación Antropométrica${latestAnthro ? ` (${formatDate(latestAnthro.date)})` : ""}`,
        rightX,
        rightY,
        colWidth,
      );
      const cardGap = 6;
      const cardW = (colWidth - cardGap * 3) / 4;
      const cardH = 32;
      const m = latestAnthro?.metrics ?? {};
      const row1: [string, string][] = [
        [m.weight !== undefined ? `${m.weight} kg` : "—", "Peso corporal"],
        [m.height !== undefined ? `${m.height} cm` : "—", "Talla / Altura"],
        [m.muscleMassPercent !== undefined ? `${m.muscleMassPercent}%` : "—", "T. Muscular"],
        [m.bodyFatPercent !== undefined ? `${m.bodyFatPercent}%` : "—", "T. Adiposo"],
      ];
      const row2: [string, string][] = [
        [latestAnthro?.imc !== null && latestAnthro?.imc !== undefined ? String(latestAnthro.imc) : "—", "IMC"],
        [m.skinfoldsSum !== undefined ? `${m.skinfoldsSum}mm` : "—", "S6P (6 pl.)"],
        [m.imo !== undefined ? String(m.imo) : "—", "Índice IMO"],
        [m.age !== undefined ? String(m.age) : "—", "Edad (años)"],
      ];
      row1.forEach(([value, label], i) => drawStatCard(doc, rightX + i * (cardW + cardGap), rightY, cardW, cardH, value, label));
      rightY += cardH + cardGap;
      row2.forEach(([value, label], i) => drawStatCard(doc, rightX + i * (cardW + cardGap), rightY, cardW, cardH, value, label));
      rightY += cardH + 10;

      rightY = columnSectionTitle(doc, "Historial Comparativo de Mediciones", rightX, rightY, colWidth);
      if (anthro.length === 0) {
        rightY = columnText(doc, "Sin mediciones antropométricas registradas.", rightX, rightY, colWidth, { fontSize: 8 });
      } else {
        rightY =
          drawMiniTable(
            doc,
            rightX,
            rightY,
            colWidth,
            ["Fecha", "Peso/Talla", "IMC", "Clasif.", "Evaluador"],
            anthro.map((r) => [
              formatDate(r.date),
              `${r.metrics.weight ?? "—"}kg · ${r.metrics.height ?? "—"}cm`,
              r.imc !== null ? String(r.imc) : "—",
              r.clasificacion,
              `${r.recordedBy.firstName} ${r.recordedBy.lastName}`,
            ]),
          ) + 8;
        if (latestAnthro) {
          const diag = `Composición corporal: ${latestAnthro.clasificacion.toLowerCase()} · ${m.muscleMassPercent !== undefined ? `${m.muscleMassPercent}% masa muscular` : "sin dato de masa muscular"}.`;
          rightY = columnText(doc, diag, rightX, rightY, colWidth, { fontSize: 8 });
        }
      }

      doc.y = Math.max(leftY, rightY) + 10;

      // ---- Página 2: competencia, salud y cierre ----
      doc.addPage();
      addHeader(doc, "Rendimiento en Competencia y Validación", `${player.firstName} ${player.lastName} · ${category}`);

      const hasInjuries = injuries.length > 0;
      const numCols = hasInjuries ? 3 : 2;
      const p2ColWidth = (PAGE_CONTENT_WIDTH - colGap * (numCols - 1)) / numCols;
      const p2Top = doc.y;
      const colYs: number[] = [];

      // Columna 1: Minutos y Partidos.
      let cy = p2Top;
      let cx = PAGE_MARGIN;
      cy = columnSectionTitle(doc, "Minutos y Partidos", cx, cy, p2ColWidth);
      const statW = (p2ColWidth - cardGap * 3) / 4;
      [
        [String(totalMinutes), "Minutos"],
        [String(totalGoals), "Goles"],
        [String(totalYellow), "Amarillas"],
        [String(totalRed), "Rojas"],
      ].forEach(([value, label], i) => drawStatCard(doc, cx + i * (statW + cardGap), cy, statW, cardH, value, label));
      cy += cardH + 10;
      cy = columnSectionTitle(doc, "Último Encuentro Oficial", cx, cy, p2ColWidth);
      if (!latestMatch) {
        cy = columnText(doc, "Sin partidos registrados.", cx, cy, p2ColWidth, { fontSize: 8 });
      } else {
        const resultWord =
          latestMatch.match.teamScore === null
            ? ""
            : latestMatch.match.teamScore > latestMatch.match.opponentScore!
              ? "Triunfo"
              : latestMatch.match.teamScore < latestMatch.match.opponentScore!
                ? "Derrota"
                : "Empate";
        const scoreLine = latestMatch.match.teamScore !== null ? ` — ${resultWord} ${latestMatch.match.teamScore}-${latestMatch.match.opponentScore}` : "";
        cy = columnText(
          doc,
          `${formatDate(latestMatch.match.date)} · ${latestMatch.match.isHome ? "vs" : "@"} ${latestMatch.match.opponent}${scoreLine}`,
          cx,
          cy,
          p2ColWidth,
          { fontSize: 8 },
        );
        cy = columnText(doc, `Presencia en cancha: ${latestMatch.minutesPlayed ?? "—"} minutos disputados.`, cx, cy, p2ColWidth, { fontSize: 8 });
        cy = columnText(doc, `Aporte ofensivo: ${latestMatch.goals} gol(es).`, cx, cy, p2ColWidth, { fontSize: 8 });
        cy = columnText(
          doc,
          `Disciplina: ${latestMatch.yellowCards ? `${latestMatch.yellowCards} amarilla(s)` : "sin amonestaciones"}${latestMatch.redCard ? " · expulsión" : ""}.`,
          cx,
          cy,
          p2ColWidth,
          { fontSize: 8 },
        );
      }
      colYs.push(cy);

      // Columna 2 (solo si hay lesiones): Historial de Lesiones.
      if (hasInjuries) {
        cx = PAGE_MARGIN + p2ColWidth + colGap;
        cy = p2Top;
        cy = columnSectionTitle(doc, "Historial de Lesiones", cx, cy, p2ColWidth);
        const i = latestInjury!;
        const recoveryDays = i.actualReturnDate ? Math.round((new Date(i.actualReturnDate).getTime() - new Date(i.date).getTime()) / 86_400_000) : null;
        cy = columnText(doc, `${i.injuryType ?? i.description} — ${i.bodyPart ?? "sin zona registrada"}`, cx, cy, p2ColWidth, { fontSize: 8.5 });
        cy = columnText(doc, `Fecha: ${formatDate(i.date)}`, cx, cy, p2ColWidth, { fontSize: 8 });
        cy = columnText(doc, `Tratamiento: ${i.treatment ?? "Sin tratamiento registrado"}.`, cx, cy, p2ColWidth, { fontSize: 8 });
        cy = columnText(
          doc,
          `Tiempo de recuperación: ${recoveryDays !== null ? `${recoveryDays} día(s) de baja deportiva.` : "en curso."}`,
          cx,
          cy,
          p2ColWidth,
          { fontSize: 8 },
        );
        cy = columnText(doc, `Profesional responsable: ${i.responsibleProfessional ?? "No registrado"}.`, cx, cy, p2ColWidth, { fontSize: 8 });
        if (injuries.length > 1) {
          const others = injuries
            .slice(1, 4)
            .map((oi) => oi.injuryType ?? oi.description)
            .join(", ");
          cy = columnText(doc, `Lesiones anteriores: ${others}.`, cx, cy, p2ColWidth, { fontSize: 7.5 });
        }
        colYs.push(cy);
      }

      // Última columna: Observaciones.
      cx = PAGE_MARGIN + (numCols - 1) * (p2ColWidth + colGap);
      cy = p2Top;
      cy = columnSectionTitle(doc, "Observaciones", cx, cy, p2ColWidth);
      cy = columnText(doc, latestObservation ?? "Sin observaciones registradas.", cx, cy, p2ColWidth, { fontSize: 8 });
      colYs.push(cy);

      doc.y = Math.max(...colYs) + 10;
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
    const keyByDimension = new Map(dimensions.map((d) => [d.id, d.key]));
    const playerIds = players.map((p) => p.id);

    const [evaluations, nutritionRecords, injuries, appearances] = await Promise.all([
      this.prisma.evaluation.findMany({
        where: { playerId: { in: playerIds } },
        include: { scores: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
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
          key: keyByDimension.get(dimensionId) ?? "",
          weight: weightByDimension.get(dimensionId) ?? 0,
          average: values.reduce((a, b) => a + b, 0) / values.length,
        }));
        notaFinal = computeNotaFinalForType(dimensionAverages, ev.type);
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

  /**
   * Rendimiento Físico — SJ/CMJ/IE/sprints/VIFT. Deliberately its own PDF,
   * never merged into buildPlayerReportPdf/buildTeamReportPdf (explicit
   * requirement — this module is independent of Evaluaciones/Médica).
   */
  async buildPhysicalPerformancePdf(user: AuthenticatedUser, playerId: string): Promise<Buffer> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { currentTeam: { include: { category: true } } },
    });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    const records = await this.prisma.physicalRecord.findMany({
      where: { playerId, recordType: "PERFORMANCE" },
      orderBy: { date: "asc" },
    });
    const parsed = records.map((r) => ({ date: r.date, metrics: JSON.parse(r.metrics) as Record<string, number> }));

    return renderPdfToBuffer((doc) => {
      addHeader(doc, `${player.firstName} ${player.lastName}`, "Rendimiento Físico");
      const category = player.currentTeam?.category?.name ?? "Sin categoría";
      doc.fontSize(10).fillColor(COLORS.gris);
      fullWidthText(doc, category);
      doc.moveDown(0.8);

      sectionTitle(doc, "Historial de mediciones");
      if (parsed.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin mediciones registradas.");
      } else {
        const cols = [
          ["sj", "SJ (cm)"],
          ["cmj", "CMJ (cm)"],
          ["ie", "IE (%)"],
          ["sprint10m", "10m (s)"],
          ["sprint20m", "20m (s)"],
          ["sprint30m", "30m (s)"],
          ["vift", "VIFT (km/h)"],
        ] as const;
        doc.fontSize(8).fillColor(COLORS.rojoOscuro).font("Helvetica-Bold");
        fullWidthText(doc, `Fecha        ${cols.map(([, label]) => label).join("   ")}`);
        doc.font("Helvetica");
        for (const r of parsed) {
          ensureSpace(doc, 14);
          const row = cols.map(([key]) => (r.metrics[key] !== undefined ? String(r.metrics[key]) : "—"));
          doc.fontSize(8).fillColor(COLORS.carbon);
          fullWidthText(doc, `${formatDate(r.date)}   ${row.join("      ")}`);
        }

        const latest = parsed[parsed.length - 1].metrics;
        if (latest.vift !== undefined || latest.cmj !== undefined) {
          sectionTitle(doc, "Última medición");
          if (latest.cmj !== undefined) drawBar(doc, "CMJ (cm)", latest.cmj, Math.max(...parsed.map((p) => p.metrics.cmj ?? 0), 40), COLORS.rojo);
          if (latest.vift !== undefined) drawBar(doc, "VIFT (km/h)", latest.vift, Math.max(...parsed.map((p) => p.metrics.vift ?? 0), 25), COLORS.dorado);
        }
      }

      addSignatureBlock(doc);
    });
  }

  /**
   * Revisión de Peso — control semanal de peso/talla/edad/IMC. Deliberately
   * separate from la Evaluación Antropométrica de Área Médica (su propia
   * sección en buildPlayerReportPdf), ya que este dato se ingresa con mayor
   * frecuencia y por personal distinto.
   */
  async buildWeightCheckPdf(user: AuthenticatedUser, playerId: string): Promise<Buffer> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { currentTeam: { include: { category: true } } },
    });
    if (!player) throw new NotFoundException("Jugador no encontrado");

    const records = await this.prisma.physicalRecord.findMany({
      where: { playerId, recordType: "WEIGHT_CHECK" },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });
    const parsed = records.map((r) => {
      const metrics = JSON.parse(r.metrics) as Record<string, number>;
      const imc = metrics.weight && metrics.height ? Number((metrics.weight / (metrics.height / 100) ** 2).toFixed(1)) : null;
      const clasificacion = imc === null ? "—" : imc < 18.5 ? "Riesgo de desnutrición" : imc < 25 ? "Normal" : imc < 30 ? "Sobrepeso" : "Obesidad";
      return { date: r.date, metrics, imc, clasificacion, recordedBy: r.recordedBy };
    });
    const latest = parsed[0] ?? null;

    return renderPdfToBuffer((doc) => {
      addHeader(doc, `${player.firstName} ${player.lastName}`, "Revisión de Peso");
      const category = player.currentTeam?.category?.name ?? "Sin categoría";
      doc.fontSize(10).fillColor(COLORS.gris);
      fullWidthText(doc, category);
      doc.moveDown(0.8);

      sectionTitle(doc, latest ? `Última revisión (${formatDate(latest.date)})` : "Última revisión");
      if (!latest) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin revisiones de peso registradas.");
      } else {
        const cardGap = 8;
        const cardW = (PAGE_CONTENT_WIDTH - cardGap * 4) / 5;
        const cardH = 34;
        const cardY = doc.y;
        const cards: [string, string][] = [
          [latest.metrics.weight !== undefined ? `${latest.metrics.weight} kg` : "—", "Peso"],
          [latest.metrics.height !== undefined ? `${latest.metrics.height} cm` : "—", "Talla"],
          [latest.metrics.age !== undefined ? String(latest.metrics.age) : "—", "Edad"],
          [latest.imc !== null ? String(latest.imc) : "—", "IMC"],
          [latest.clasificacion, "Clasificación"],
        ];
        cards.forEach(([value, label], i) => drawStatCard(doc, PAGE_MARGIN + i * (cardW + cardGap), cardY, cardW, cardH, value, label));
        doc.y = cardY + cardH + 14;
      }

      sectionTitle(doc, "Historial de revisiones");
      if (parsed.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin revisiones de peso registradas.");
      } else {
        doc.fontSize(8).fillColor(COLORS.rojoOscuro).font("Helvetica-Bold");
        fullWidthText(doc, "Fecha        Peso        Talla        Edad        IMC        Clasificación        Registró");
        doc.font("Helvetica");
        for (const r of parsed) {
          ensureSpace(doc, 14);
          doc.fontSize(8).fillColor(COLORS.carbon);
          fullWidthText(
            doc,
            `${formatDate(r.date)}   ${r.metrics.weight !== undefined ? `${r.metrics.weight}kg` : "—"}      ${r.metrics.height !== undefined ? `${r.metrics.height}cm` : "—"}      ${r.metrics.age !== undefined ? r.metrics.age : "—"}      ${r.imc !== null ? r.imc : "—"}      ${r.clasificacion}      ${r.recordedBy.firstName} ${r.recordedBy.lastName}`,
          );
        }
      }

      addSignatureBlock(doc);
    });
  }

  /**
   * One match, full detail: rival/fecha/condición/logística, cuerpo técnico,
   * traslados (si es de visita) y la nómina completa de citados/titulares.
   */
  async buildMatchReportPdf(user: AuthenticatedUser, matchId: string): Promise<Buffer> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team: { include: { category: true } },
        appearances: { include: { player: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!match) throw new NotFoundException("Partido no encontrado");
    assertTeamInScope(user, match.teamId, PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED);

    return renderPdfToBuffer((doc) => {
      addHeader(doc, `${match.isHome ? "vs" : "@"} ${match.opponent}`, `${match.team.name}${match.team.category ? ` — ${match.team.category.name}` : ""}`);
      this.drawMatchDetail(doc, match, { includeRoster: true });
      addSignatureBlock(doc);
    });
  }

  /**
   * Fixture completo de un equipo: página 1 con el resumen de la temporada
   * (como el reporte de categoría existente), y una página por partido con
   * el mismo detalle que el export individual — sin la nómina de citados,
   * para mantener el archivo liviano (ya cubierta por el export partido a partido).
   */
  async buildFixtureReportPdf(user: AuthenticatedUser, teamId: string): Promise<Buffer> {
    assertTeamInScope(user, teamId, PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED);
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: { category: true, season: true } });
    if (!team) throw new NotFoundException("Equipo no encontrado");

    const matches = await this.prisma.match.findMany({ where: { teamId }, orderBy: { date: "asc" } });

    return renderPdfToBuffer((doc) => {
      addHeader(doc, "Fixture de temporada", `${team.name}${team.category ? ` — ${team.category.name}` : ""}${team.season ? ` · ${team.season.name}` : ""}`);

      sectionTitle(doc, "Resumen de partidos");
      if (matches.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin partidos cargados.");
      } else {
        doc.fontSize(8).fillColor(COLORS.rojoOscuro).font("Helvetica-Bold");
        fullWidthText(doc, "Fecha        Rival                            Cond.    Resultado    Estado");
        doc.font("Helvetica");
        for (const m of matches) {
          ensureSpace(doc, 14);
          const scoreLine = m.status === "PLAYED" ? `${m.teamScore ?? "-"} - ${m.opponentScore ?? "-"}` : "—";
          doc.fontSize(8).fillColor(COLORS.carbon);
          fullWidthText(
            doc,
            `${formatDate(m.date)}   ${m.opponent.padEnd(28).slice(0, 28)}   ${m.isHome ? "Local " : "Visita"}   ${scoreLine.padEnd(10)}   ${MATCH_STATUS_LABELS[m.status as keyof typeof MATCH_STATUS_LABELS] ?? m.status}`,
          );
        }
      }

      for (const match of matches) {
        doc.addPage();
        addHeader(doc, `${match.isHome ? "vs" : "@"} ${match.opponent}`, formatDate(match.date));
        this.drawMatchDetail(doc, match, { includeRoster: false });
      }

      addSignatureBlock(doc);
    });
  }

  /** Shared match-detail block used by both buildMatchReportPdf and buildFixtureReportPdf. */
  private drawMatchDetail(doc: PDFKit.PDFDocument, match: any, options: { includeRoster: boolean }) {
    sectionTitle(doc, "Datos del partido");
    const infoRows: [string, string | null | undefined][] = [
      ["Fecha", formatDate(match.date)],
      ["Condición", match.isHome ? "Local" : "Visita"],
      ["Estado", MATCH_STATUS_LABELS[match.status as keyof typeof MATCH_STATUS_LABELS] ?? match.status],
      ["Ciudad", match.city],
      ["Estadio", match.venue],
      ["Hora de citación", match.meetingTime],
      ["Hora de partido", match.kickoffTime],
    ];
    if (match.status === "PLAYED") {
      infoRows.push(["Resultado", `${match.teamScore ?? "-"} - ${match.opponentScore ?? "-"}`]);
    }
    for (const [label, value] of infoRows) {
      if (!value) continue;
      ensureSpace(doc, 14);
      doc.fontSize(9).fillColor(COLORS.gris).font("Helvetica-Bold");
      doc.text(label, PAGE_MARGIN, doc.y, { continued: true, width: 140 });
      doc.font("Helvetica").fillColor(COLORS.carbon).text(`: ${value}`);
    }

    sectionTitle(doc, "Cuerpo técnico");
    const staffRows: [string, string | null | undefined][] = [
      ["Entrenador", match.coachName],
      ["Preparador físico", match.physicalTrainerName],
      ["Preparador de Arqueros", match.goalkeeperCoachName],
      ["Kinesiólogo", match.kineName],
      ["Utilero", match.equipmentManagerName],
      ["Coordinador", match.coordinatorName],
      ["Otro", match.otherStaffNotes],
    ];
    const anyStaff = staffRows.some(([, v]) => v);
    if (!anyStaff) {
      doc.fontSize(9).fillColor(COLORS.gris);
      fullWidthText(doc, "Sin datos de cuerpo técnico cargados.");
    } else {
      for (const [label, value] of staffRows) {
        if (!value) continue;
        ensureSpace(doc, 14);
        doc.fontSize(9).fillColor(COLORS.gris).font("Helvetica-Bold");
        doc.text(label, PAGE_MARGIN, doc.y, { continued: true, width: 140 });
        doc.font("Helvetica").fillColor(COLORS.carbon).text(`: ${value}`);
      }
    }

    if (!match.isHome) {
      const travelRows: [string, string | null | undefined][] = [
        ["Presentación cuerpo técnico", match.techStaffArrivalTime],
        ["Presentación jugadores", match.playersArrivalTime],
        ["Salida del bus", match.busDepartureTime],
        ["Punto de encuentro", match.meetingPoint],
        ["Hotel", match.hotelNameAddress],
      ];
      if (travelRows.some(([, v]) => v)) {
        sectionTitle(doc, "Traslados y alojamiento");
        for (const [label, value] of travelRows) {
          if (!value) continue;
          ensureSpace(doc, 14);
          doc.fontSize(9).fillColor(COLORS.gris).font("Helvetica-Bold");
          doc.text(label, PAGE_MARGIN, doc.y, { continued: true, width: 140 });
          doc.font("Helvetica").fillColor(COLORS.carbon).text(`: ${value}`);
        }
      }
    }

    if (options.includeRoster) {
      sectionTitle(doc, "Jugadores citados");
      const appearances = (match.appearances ?? []) as { started: boolean; startingEleven: boolean; minutesPlayed: number | null; goals: number; yellowCards: number; redCard: boolean; player: { firstName: string; lastName: string } }[];
      if (appearances.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin citación cargada.");
      } else {
        const sorted = [...appearances].sort((a, b) => a.player.lastName.localeCompare(b.player.lastName));
        drawTable(
          doc,
          [
            { key: "jugador", header: "Jugador", width: 205 },
            { key: "citado", header: "Citado", width: 48, align: "center" },
            { key: "titular", header: "Titular", width: 48, align: "center" },
            { key: "min", header: "Min.", width: 44, align: "center" },
            { key: "goles", header: "Goles", width: 44, align: "center" },
            { key: "amar", header: "Amar.", width: 44, align: "center" },
            { key: "roja", header: "Roja", width: 42, align: "center" },
          ],
          sorted.map((a) => ({
            jugador: `${a.player.firstName} ${a.player.lastName}`,
            citado: a.started ? "Sí" : "No",
            titular: a.startingEleven ? "Sí" : "No",
            min: a.minutesPlayed !== null ? String(a.minutesPlayed) : "—",
            goles: String(a.goals),
            amar: String(a.yellowCards),
            roja: a.redCard ? "Sí" : "No",
          })),
        );
      }
    }
  }

  /** Balance por mes + totales generales, reutilizando FinanceService.getSummary() (ya calcula el desglose mensual). */
  async buildFinanceReportPdf(): Promise<Buffer> {
    const summary = await this.financeService.getSummary();

    return renderPdfToBuffer((doc) => {
      addHeader(doc, "Reporte Financiero", "Balance por mes y totales generales");

      sectionTitle(doc, "Totales generales");
      const statY = doc.y;
      const cardW = (PAGE_CONTENT_WIDTH - 16) / 3;
      drawStatCard(doc, PAGE_MARGIN, statY, cardW, 50, formatCLP(summary.totalIncome), "Ingresos totales");
      drawStatCard(doc, PAGE_MARGIN + cardW + 8, statY, cardW, 50, formatCLP(summary.totalExpense), "Gastos totales");
      drawStatCard(doc, PAGE_MARGIN + (cardW + 8) * 2, statY, cardW, 50, formatCLP(summary.balance), "Balance");
      doc.y = statY + 60;

      sectionTitle(doc, "Balance por mes");
      if (summary.byMonth.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gris);
        fullWidthText(doc, "Sin movimientos registrados.");
      } else {
        doc.fontSize(8).fillColor(COLORS.rojoOscuro).font("Helvetica-Bold");
        fullWidthText(doc, "Mes                     Ingresos          Gastos            Balance");
        doc.font("Helvetica");
        for (const m of summary.byMonth) {
          ensureSpace(doc, 14);
          const label = new Date(`${m.month}-01`).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
          doc.fontSize(8).fillColor(COLORS.carbon);
          fullWidthText(
            doc,
            `${label.padEnd(23).slice(0, 23)}  ${formatCLP(m.income).padEnd(16)}  ${formatCLP(m.expense).padEnd(16)}  ${formatCLP(m.balance)}`,
          );
        }
      }

      addSignatureBlock(doc);
    });
  }
}
