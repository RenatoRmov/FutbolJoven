export type PlayerStatus = "ACTIVE" | "INJURED" | "SUSPENDED" | "INACTIVE" | "LEFT_CLUB";

export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  ACTIVE: "Activo",
  INJURED: "Lesionado",
  SUSPENDED: "Suspendido",
  INACTIVE: "Inactivo",
  LEFT_CLUB: "Fuera del club",
};

export type DominantFoot = "LEFT" | "RIGHT" | "BOTH";

export const DOMINANT_FOOT_LABELS: Record<DominantFoot, string> = {
  LEFT: "Izquierdo",
  RIGHT: "Derecho",
  BOTH: "Ambidiestro",
};

export type PlayerGender = "MALE" | "FEMALE";

export const PLAYER_GENDER_LABELS: Record<PlayerGender, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
};

/**
 * Real position taxonomy used by the club, grouped into 4 families
 * (Arquero/Defensa/Volantes/Delanteros) so the UI can offer a cascading
 * select: pick the family first, then the exact position within it.
 */
export type PlayerPosition =
  | "ARQUERO"
  | "LATERAL_DERECHO"
  | "LATERAL_IZQUIERDO"
  | "DEFENSA_CENTRAL_DERECHO"
  | "DEFENSA_CENTRAL_IZQUIERDO"
  | "VOLANTE_CENTRAL"
  | "VOLANTE_MIXTO"
  | "VOLANTE_OFENSIVO"
  | "DELANTERO_CENTRO"
  | "EXTREMO_DERECHO"
  | "EXTREMO_IZQUIERDO";

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  ARQUERO: "Arquero",
  LATERAL_DERECHO: "Lateral derecho",
  LATERAL_IZQUIERDO: "Lateral izquierdo",
  DEFENSA_CENTRAL_DERECHO: "Defensa central derecho",
  DEFENSA_CENTRAL_IZQUIERDO: "Defensa central izquierdo",
  VOLANTE_CENTRAL: "Volante central",
  VOLANTE_MIXTO: "Volante mixto",
  VOLANTE_OFENSIVO: "Volante ofensivo",
  DELANTERO_CENTRO: "Delantero centro",
  EXTREMO_DERECHO: "Extremo derecho",
  EXTREMO_IZQUIERDO: "Extremo izquierdo",
};

export type PositionGroup = "ARQUERO" | "DEFENSA" | "VOLANTES" | "DELANTEROS";

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  ARQUERO: "Arquero",
  DEFENSA: "Defensa",
  VOLANTES: "Volantes / Mediocampistas",
  DELANTEROS: "Delanteros",
};

/** Which positions belong to each family, for the cascading Grupo → Posición select. */
export const POSITION_GROUPS: Record<PositionGroup, PlayerPosition[]> = {
  ARQUERO: ["ARQUERO"],
  DEFENSA: ["LATERAL_DERECHO", "LATERAL_IZQUIERDO", "DEFENSA_CENTRAL_DERECHO", "DEFENSA_CENTRAL_IZQUIERDO"],
  VOLANTES: ["VOLANTE_CENTRAL", "VOLANTE_MIXTO", "VOLANTE_OFENSIVO"],
  DELANTEROS: ["DELANTERO_CENTRO", "EXTREMO_DERECHO", "EXTREMO_IZQUIERDO"],
};

export function groupForPosition(position: PlayerPosition | string | null | undefined): PositionGroup | null {
  if (!position) return null;
  for (const [group, positions] of Object.entries(POSITION_GROUPS) as [PositionGroup, PlayerPosition[]][]) {
    if (positions.includes(position as PlayerPosition)) return group;
  }
  return null;
}

export type HealthSystem = "FONASA" | "ISAPRE" | "OTHER";

export const HEALTH_SYSTEM_LABELS: Record<HealthSystem, string> = {
  FONASA: "FONASA",
  ISAPRE: "ISAPRE",
  OTHER: "Otro",
};

export type UserStatus = "ACTIVE" | "DISABLED";

export interface JwtAccessPayload {
  sub: string;
  roleId: string;
  type: "access";
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  type: "refresh";
}
