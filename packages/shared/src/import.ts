import { z } from "zod";
import { playerGenderEnum, playerPositionEnum, dominantFootEnum, playerStatusEnum } from "./schemas";

/**
 * Column contract for the players import/export template. Drives both the
 * downloadable .xlsx template (apps/api) and the frontend's column-help
 * text — a single source of truth for what's required vs. optional, per
 * the "documentar columnas obligatorias/opcionales" requirement.
 */
export interface ImportColumnDef {
  key: string;
  label: string;
  required: boolean;
  example: string;
  help?: string;
}

export const PLAYER_IMPORT_COLUMNS: ImportColumnDef[] = [
  { key: "documentId", label: "RUT / Documento", required: false, example: "23607715-2", help: "Usado para detectar duplicados y actualizaciones" },
  { key: "firstName", label: "Nombres", required: true, example: "Ignacio Andrés" },
  { key: "lastName", label: "Apellidos", required: true, example: "Benítez Núñez" },
  { key: "birthDate", label: "Fecha de nacimiento", required: true, example: "2011-03-28", help: "Formato AAAA-MM-DD, DD/MM/AAAA o DD.MM.AAAA" },
  { key: "category", label: "Categoría", required: true, example: "Sub-15", help: "Debe coincidir con una categoría existente en el club" },
  { key: "gender", label: "Género", required: false, example: "MALE", help: "MALE o FEMALE" },
  { key: "nationality", label: "Nacionalidad", required: false, example: "Chile" },
  { key: "city", label: "Ciudad", required: false, example: "Limache" },
  { key: "position", label: "Posición principal", required: false, example: "DEFENSA_CENTRAL" },
  { key: "dominantFoot", label: "Pie hábil", required: false, example: "RIGHT", help: "LEFT, RIGHT o BOTH" },
  { key: "height", label: "Altura (cm)", required: false, example: "165" },
  { key: "weight", label: "Peso (kg)", required: false, example: "55" },
  { key: "jerseyNumber", label: "Dorsal", required: false, example: "10" },
  { key: "joinDate", label: "Fecha de ingreso", required: false, example: "2026-02-01", help: "Si se omite, se usa la fecha de hoy" },
  { key: "status", label: "Estado", required: false, example: "ACTIVE", help: "ACTIVE, INJURED, SUSPENDED, INACTIVE o LEFT_CLUB" },
];

export const importPlayerRowSchema = z.object({
  documentId: z.string().trim().max(40).optional().nullable(),
  firstName: z.string().trim().min(1, "Nombres es obligatorio").max(80),
  lastName: z.string().trim().min(1, "Apellidos es obligatorio").max(80),
  birthDate: z.coerce.date({ errorMap: () => ({ message: "Fecha de nacimiento inválida" }) }),
  category: z.string().trim().min(1, "Categoría es obligatoria"),
  gender: playerGenderEnum.optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  position: playerPositionEnum.optional().nullable(),
  dominantFoot: dominantFootEnum.optional().nullable(),
  height: z.coerce.number().positive().max(250).optional().nullable(),
  weight: z.coerce.number().positive().max(200).optional().nullable(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
  joinDate: z.coerce.date().optional().nullable(),
  status: playerStatusEnum.optional().nullable(),
});
export type ImportPlayerRow = z.infer<typeof importPlayerRowSchema>;

export interface ImportRowResult {
  row: number;
  data: Record<string, unknown>;
  outcome: "valid" | "duplicate_in_file" | "error";
  action?: "create" | "update";
  errors?: string[];
}

export interface ImportPreviewResponse {
  rows: ImportRowResult[];
  summary: { toCreate: number; toUpdate: number; duplicates: number; errors: number; total: number };
}

export interface ImportConfirmResponse {
  imported: number;
  updated: number;
  skipped: number;
}
