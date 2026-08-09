/**
 * Default evaluation configuration seeded on first run. All of this is
 * stored in DB (EvaluationScale/EvaluationDimension/EvaluationMetric) and
 * editable by an admin — these constants exist only to seed sensible
 * defaults and to give the frontend fallback labels.
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
  metrics: string[];
}

export const DEFAULT_DIMENSIONS: DefaultDimensionSeed[] = [
  {
    key: "technical",
    name: "Técnica",
    order: 1,
    metrics: [
      "Control",
      "Pase",
      "Conducción",
      "Regate",
      "Primer toque",
      "Finalización",
      "Centros",
      "Juego aéreo",
      "Técnica defensiva",
    ],
  },
  {
    key: "tactical",
    name: "Táctica",
    order: 2,
    metrics: [
      "Comprensión del juego",
      "Toma de decisiones",
      "Posicionamiento",
      "Lectura del juego",
      "Transiciones",
      "Juego sin balón",
      "Comprensión del sistema",
    ],
  },
  {
    key: "physical",
    name: "Físico",
    order: 3,
    metrics: ["Velocidad", "Aceleración", "Resistencia", "Fuerza", "Potencia", "Agilidad", "Coordinación"],
  },
  {
    key: "mental",
    name: "Mental",
    order: 4,
    metrics: ["Concentración", "Confianza", "Disciplina", "Inteligencia competitiva", "Atención", "Adaptabilidad"],
  },
  {
    key: "resilience",
    name: "Resiliencia",
    order: 5,
    metrics: [
      "Respuesta al error",
      "Respuesta ante la adversidad",
      "Persistencia",
      "Capacidad de recuperación",
      "Competitividad",
      "Manejo de presión",
    ],
  },
  {
    key: "social",
    name: "Social / Conductual",
    order: 6,
    metrics: ["Trabajo en equipo", "Comunicación", "Liderazgo", "Respeto", "Responsabilidad", "Comportamiento"],
  },
];

export type EvaluationType = "MATCH" | "TRAINING" | "PERIOD";

export const EVALUATION_TYPES: { value: EvaluationType; label: string }[] = [
  { value: "MATCH", label: "Partido" },
  { value: "TRAINING", label: "Entrenamiento" },
  { value: "PERIOD", label: "Período" },
];
