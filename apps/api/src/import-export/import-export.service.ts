import { BadRequestException, Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { importPlayerRowSchema, PLAYER_IMPORT_COLUMNS } from "@futboljoven/shared";
import type { ImportConfirmResponse, ImportPreviewResponse, ImportRowResult } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PlayersService } from "../players/players.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { PlayerFilters } from "../players/players.service";

const TEMPLATE_SHEET = "Jugadores";

function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCategoryName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES = new Map<string, string>();
for (const col of PLAYER_IMPORT_COLUMNS) {
  HEADER_ALIASES.set(normalizeHeader(col.label), col.key);
  HEADER_ALIASES.set(normalizeHeader(col.key), col.key);
}

function parseFlexibleDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(str);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    // Day-first (Chilean/Spanish locale) is the default; if the "day" value
    // can't be a day (>31) but fits as a month, fall back to month-first.
    if (day > 12 && month <= 12) return new Date(Number(dmy[3]), month - 1, day);
    if (day <= 12) return new Date(Number(dmy[3]), day - 1, month); // ambiguous -> assume day-first
    return new Date(Number(dmy[3]), month - 1, day);
  }

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (mdy) return new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));

  const native = new Date(str);
  return isNaN(native.getTime()) ? null : native;
}

@Injectable()
export class ImportExportService {
  constructor(
    private prisma: PrismaService,
    private playersService: PlayersService,
  ) {}

  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(TEMPLATE_SHEET);
    sheet.columns = PLAYER_IMPORT_COLUMNS.map((c) => ({ header: c.required ? `${c.label} *` : c.label, key: c.key, width: 22 }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRow(Object.fromEntries(PLAYER_IMPORT_COLUMNS.map((c) => [c.key, c.example])));
    sheet.getRow(2).font = { italic: true, color: { argb: "FF888888" } };

    const helpSheet = workbook.addWorksheet("Instrucciones");
    helpSheet.columns = [
      { header: "Columna", key: "label", width: 26 },
      { header: "Obligatoria", key: "required", width: 14 },
      { header: "Ejemplo", key: "example", width: 22 },
      { header: "Ayuda", key: "help", width: 50 },
    ];
    helpSheet.getRow(1).font = { bold: true };
    for (const c of PLAYER_IMPORT_COLUMNS) {
      helpSheet.addRow({ label: c.label, required: c.required ? "Sí" : "No", example: c.example, help: c.help ?? "" });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async preview(fileBuffer: Buffer): Promise<ImportPreviewResponse> {
    const rawRows = await this.parseWorkbook(fileBuffer);
    const categories = await this.prisma.category.findMany();
    const categoryByNormalized = new Map(categories.map((c) => [normalizeCategoryName(c.name), c]));
    const teams = await this.prisma.team.findMany({ where: { season: { isActive: true } } });
    const teamByCategoryId = new Map(teams.map((t) => [t.categoryId, t]));

    const existingByDocId = new Map(
      (await this.prisma.player.findMany({ where: { documentId: { not: null } } })).map((p) => [p.documentId as string, p]),
    );

    const seenInFile = new Set<string>();
    const results: ImportRowResult[] = [];

    let toCreate = 0;
    let toUpdate = 0;
    let duplicates = 0;
    let errors = 0;

    rawRows.forEach((raw, i) => {
      const rowNumber = i + 3; // header + example row offset for user-facing row numbers
      const errorList: string[] = [];

      const candidate: Record<string, unknown> = {
        documentId: raw.documentId || null,
        firstName: raw.firstName,
        lastName: raw.lastName,
        birthDate: parseFlexibleDate(raw.birthDate),
        category: raw.category,
        gender: raw.gender ? String(raw.gender).toUpperCase() : null,
        nationality: raw.nationality || null,
        city: raw.city || null,
        position: raw.position ? String(raw.position).toUpperCase().replace(/\s+/g, "_") : null,
        dominantFoot: raw.dominantFoot ? String(raw.dominantFoot).toUpperCase() : null,
        height: raw.height || null,
        weight: raw.weight || null,
        jerseyNumber: raw.jerseyNumber || null,
        joinDate: parseFlexibleDate(raw.joinDate) ?? new Date(),
        status: raw.status ? String(raw.status).toUpperCase() : null,
      };

      const parsed = importPlayerRowSchema.safeParse(candidate);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) errorList.push(issue.message);
      }

      const category = raw.category ? categoryByNormalized.get(normalizeCategoryName(String(raw.category))) : undefined;
      if (raw.category && !category) errorList.push(`Categoría "${raw.category}" no existe en el club`);
      const team = category ? teamByCategoryId.get(category.id) : undefined;
      if (category && !team) errorList.push(`No hay equipo activo creado para la categoría "${category.name}" en la temporada activa`);

      if (errorList.length > 0) {
        errors++;
        results.push({ row: rowNumber, data: candidate, outcome: "error", errors: errorList });
        return;
      }

      const docId = candidate.documentId as string | null;
      if (docId && seenInFile.has(docId)) {
        duplicates++;
        results.push({ row: rowNumber, data: candidate, outcome: "duplicate_in_file", errors: [`RUT/Documento "${docId}" repetido dentro del archivo`] });
        return;
      }
      if (docId) seenInFile.add(docId);

      const existing = docId ? existingByDocId.get(docId) : undefined;
      const action = existing ? "update" : "create";
      if (action === "update") toUpdate++;
      else toCreate++;

      results.push({
        row: rowNumber,
        outcome: "valid",
        action,
        data: { ...candidate, teamId: team!.id, existingPlayerId: existing?.id ?? null },
      });
    });

    return {
      rows: results,
      summary: { toCreate, toUpdate, duplicates, errors, total: rawRows.length },
    };
  }

  async confirm(user: AuthenticatedUser, rows: ImportRowResult[]): Promise<ImportConfirmResponse> {
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (row.outcome !== "valid") {
        skipped++;
        continue;
      }
      const d = row.data as Record<string, any>;
      try {
        if (row.action === "update" && d.existingPlayerId) {
          await this.playersService.update(user, d.existingPlayerId, {
            firstName: d.firstName,
            lastName: d.lastName,
            birthDate: d.birthDate,
            gender: d.gender,
            nationality: d.nationality,
            city: d.city,
            documentId: d.documentId,
            teamId: d.teamId,
            primaryPosition: d.position,
            dominantFoot: d.dominantFoot,
            height: d.height,
            weight: d.weight,
            jerseyNumber: d.jerseyNumber,
            status: d.status ?? undefined,
          });
          updated++;
        } else {
          await this.playersService.create(user, {
            firstName: d.firstName,
            lastName: d.lastName,
            birthDate: d.birthDate,
            gender: d.gender,
            nationality: d.nationality,
            city: d.city,
            documentId: d.documentId,
            teamId: d.teamId,
            joinDate: d.joinDate ?? new Date(),
            primaryPosition: d.position,
            dominantFoot: d.dominantFoot,
            height: d.height,
            weight: d.weight,
            jerseyNumber: d.jerseyNumber,
            status: d.status ?? "ACTIVE",
            secondaryPositions: [],
          });
          imported++;
        }
      } catch {
        skipped++;
      }
    }

    return { imported, updated, skipped };
  }

  async exportPlayers(user: AuthenticatedUser, filters: PlayerFilters): Promise<Buffer> {
    const players = await this.playersService.findAll(user, filters);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Jugadores");
    sheet.columns = [
      { header: "RUT / Documento", key: "documentId", width: 18 },
      { header: "Nombres", key: "firstName", width: 20 },
      { header: "Apellidos", key: "lastName", width: 24 },
      { header: "Fecha de nacimiento", key: "birthDate", width: 16 },
      { header: "Categoría", key: "category", width: 18 },
      { header: "Género", key: "gender", width: 10 },
      { header: "Nacionalidad", key: "nationality", width: 16 },
      { header: "Posición", key: "position", width: 20 },
      { header: "Dorsal", key: "jerseyNumber", width: 8 },
      { header: "Estado", key: "status", width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const p of players as any[]) {
      sheet.addRow({
        documentId: p.documentId ?? "",
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate ? new Date(p.birthDate).toISOString().slice(0, 10) : "",
        category: p.currentTeam?.category?.name ?? "",
        gender: p.gender ?? "",
        nationality: p.nationality ?? "",
        position: p.primaryPosition ?? "",
        jerseyNumber: p.jerseyNumber ?? "",
        status: p.status,
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async parseWorkbook(fileBuffer: Buffer): Promise<Record<string, unknown>[]> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch {
      throw new BadRequestException("No se pudo leer el archivo. Verificá que sea un .xlsx válido.");
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException("El archivo no tiene hojas");

    const headerRow = sheet.getRow(1);
    const columnKeyByIndex = new Map<number, string>();
    headerRow.eachCell((cell, colNumber) => {
      const raw = String(cell.value ?? "").replace(/\*$/, "").trim();
      const key = HEADER_ALIASES.get(normalizeHeader(raw));
      if (key) columnKeyByIndex.set(colNumber, key);
    });
    if (columnKeyByIndex.size === 0) {
      throw new BadRequestException("No se reconocieron las columnas del archivo. Usá la plantilla descargable.");
    }

    const rows: Record<string, unknown>[] = [];
    for (let r = 3; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (row.cellCount === 0) continue;
      const obj: Record<string, unknown> = {};
      let hasData = false;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const key = columnKeyByIndex.get(colNumber);
        if (!key) return;
        let value = cell.value;
        if (value && typeof value === "object" && "text" in (value as any)) value = (value as any).text;
        if (value !== null && value !== undefined && value !== "") hasData = true;
        obj[key] = value;
      });
      if (hasData) rows.push(obj);
    }
    return rows;
  }
}
