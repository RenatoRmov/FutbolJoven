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

export type PlayerPosition =
  | "GOALKEEPER"
  | "CENTER_BACK"
  | "FULL_BACK"
  | "DEFENSIVE_MIDFIELDER"
  | "CENTRAL_MIDFIELDER"
  | "ATTACKING_MIDFIELDER"
  | "WINGER"
  | "STRIKER";

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  GOALKEEPER: "Arquero",
  CENTER_BACK: "Defensor central",
  FULL_BACK: "Lateral",
  DEFENSIVE_MIDFIELDER: "Volante defensivo",
  CENTRAL_MIDFIELDER: "Volante central",
  ATTACKING_MIDFIELDER: "Volante ofensivo",
  WINGER: "Extremo",
  STRIKER: "Delantero",
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
