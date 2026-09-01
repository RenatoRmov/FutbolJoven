import type { z } from "zod";
import type { matchStatusEnum, financialEntryTypeEnum } from "./schemas";

export type MatchStatus = z.infer<typeof matchStatusEnum>;

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "Programado",
  PLAYED: "Jugado",
  POSTPONED: "Postergado",
  CANCELLED: "Cancelado",
};

export type FinancialEntryType = z.infer<typeof financialEntryTypeEnum>;

export const FINANCIAL_ENTRY_TYPE_LABELS: Record<FinancialEntryType, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
};

/** Suggestions only — the field itself is free text so the club isn't locked to this list. */
export const FINANCIAL_CATEGORY_SUGGESTIONS = [
  "Sueldos",
  "Arriendo cancha",
  "Indumentaria",
  "Viajes",
  "Implementación deportiva",
  "Arbitrajes",
  "Cuotas de socios",
  "Auspicios",
  "Otros",
];
