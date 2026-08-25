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
 * Real position taxonomy used by the club's own roster/evaluation
 * spreadsheets (Spanish, position-specific rather than a generic
 * English set).
 */
export type PlayerPosition =
  | "PORTERO"
  | "LATERAL_DERECHO"
  | "LATERAL_IZQUIERDO"
  | "DEFENSA_CENTRAL"
  | "MEDIOCENTRO"
  | "VOLANTE"
  | "VOLANTE_OFENSIVO"
  | "VOLANTE_MIXTO"
  | "EXTREMO_DERECHO"
  | "EXTREMO_IZQUIERDO"
  | "DELANTERO_CENTRO"
  | "DELANTERO";

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  PORTERO: "Portero",
  LATERAL_DERECHO: "Lateral derecho",
  LATERAL_IZQUIERDO: "Lateral izquierdo",
  DEFENSA_CENTRAL: "Defensa central",
  MEDIOCENTRO: "Mediocentro",
  VOLANTE: "Volante",
  VOLANTE_OFENSIVO: "Volante ofensivo",
  VOLANTE_MIXTO: "Volante mixto",
  EXTREMO_DERECHO: "Extremo derecho",
  EXTREMO_IZQUIERDO: "Extremo izquierdo",
  DELANTERO_CENTRO: "Delantero centro",
  DELANTERO: "Delantero",
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
