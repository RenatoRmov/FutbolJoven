/**
 * Default evaluation configuration seeded on first run. All of this is
 * stored in DB (EvaluationScale/EvaluationDimension/EvaluationMetric) and
 * editable by an admin — these constants exist only to seed sensible
 * defaults and to give the frontend fallback labels.
 *
 * The dimension/weight/metric structure below is not generic — it matches
 * the "Matriz Cuantitativa de Evaluación Integral del Jugador" used by a
 * real formative-football program (Programa de Desarrollo del Fútbol
 * Joven), confirmed by the weighted-average formulas found in that club's
 * own weekly tracking spreadsheet. Weights sum to 1.0.
 */

export const DEFAULT_SCALE = {
  key: "default-1-10",
  name: "Escala estándar 1-10",
  minValue: 1,
  maxValue: 10,
  labels: {
    "1": "Muy bajo",
    "2": "Bajo",
    "3": "Bajo",
    "4": "Bajo-medio",
    "5": "Medio",
    "6": "Medio-alto",
    "7": "Bueno",
    "8": "Muy bueno",
    "9": "Excelente",
    "10": "Excepcional",
  } as Record<string, string>,
};

export interface DefaultDimensionSeed {
  key: string;
  name: string;
  order: number;
  /** Fraction of the final weighted score (0-1). Sum across all dimensions = 1.0. */
  weight: number;
  metrics: string[];
}

export const DEFAULT_DIMENSIONS: DefaultDimensionSeed[] = [
  {
    key: "technical",
    name: "Técnica",
    order: 1,
    weight: 0.35,
    metrics: [
      "Pase pie hábil",
      "Pase pie no hábil",
      "Conducción de balón",
      "Controles / recepción",
      "Tiro al arco / remate",
      "Juego aéreo",
      "Primer toque",
      "Recepción bajo presión",
    ],
  },
  {
    key: "tactical",
    name: "Táctica",
    order: 2,
    weight: 0.25,
    metrics: [
      "Posicionamiento en cancha",
      "Toma de decisiones",
      "Lectura de juego",
      "Marcaje",
      "Duelos defensivos",
      "Coberturas",
      "Cumplimiento de funciones",
    ],
  },
  {
    key: "physical",
    name: "Física",
    order: 3,
    weight: 0.2,
    metrics: ["Resistencia aeróbica/anaeróbica", "Velocidad", "Fuerza muscular", "Agilidad", "Potencia en arranques"],
  },
  {
    key: "mental",
    name: "Mental / Actitudinal",
    order: 4,
    weight: 0.1,
    metrics: [
      "Resiliencia",
      "Constancia",
      "Disciplina",
      "Comunicación asertiva",
      "Concentración",
      "Trabajo en equipo",
      "Manejo de presión",
    ],
  },
  {
    key: "performance",
    name: "Rendimiento / Minutos",
    order: 5,
    weight: 0.1,
    metrics: ["Minutos jugados", "Partidos disputados", "Regularidad en el torneo", "Impacto en el juego"],
  },
];

export type EvaluationType = "MATCH" | "TRAINING" | "PERIOD";

export const EVALUATION_TYPES: { value: EvaluationType; label: string }[] = [
  { value: "MATCH", label: "Partido" },
  { value: "TRAINING", label: "Entrenamiento" },
  { value: "PERIOD", label: "Período" },
];

// ---------------------------------------------------------------------------
// Talent status ("Estatus") — computed from the weighted final score
// ("Nota Final"), never stored, so it always reflects the dimension
// weights currently configured. Thresholds below are the club's own
// operational cutoffs over a 0-10 scale.
// ---------------------------------------------------------------------------

export type TalentStatus = "PROYECTADO" | "PROYECTABLE" | "EN_DESARROLLO" | "LIMITADO" | "NO_APTO";

export const TALENT_STATUS_LABELS: Record<TalentStatus, string> = {
  PROYECTADO: "Proyectado",
  PROYECTABLE: "Proyectable",
  EN_DESARROLLO: "En desarrollo",
  LIMITADO: "Limitado",
  NO_APTO: "No apto",
};

export const TALENT_STATUS_THRESHOLDS: { status: TalentStatus; min: number }[] = [
  { status: "PROYECTADO", min: 8.83 },
  { status: "PROYECTABLE", min: 6.62 },
  { status: "EN_DESARROLLO", min: 4.41 },
  { status: "LIMITADO", min: 2.2 },
  { status: "NO_APTO", min: 0 },
];

export function computeTalentStatus(notaFinal: number | null): TalentStatus | null {
  if (notaFinal === null || Number.isNaN(notaFinal)) return null;
  for (const { status, min } of TALENT_STATUS_THRESHOLDS) {
    if (notaFinal >= min) return status;
  }
  return "NO_APTO";
}

export interface DimensionAverage {
  dimensionId: string;
  weight: number;
  average: number | null;
}

/** Weighted sum of per-dimension averages — the "Nota Final" (0-10). */
export function computeNotaFinal(dimensionAverages: DimensionAverage[]): number | null {
  const scored = dimensionAverages.filter((d) => d.average !== null);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, d) => sum + (d.average as number) * d.weight, 0);
  return Number(total.toFixed(2));
}
