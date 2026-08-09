import type { PlayerPosition } from "@futboljoven/shared";

export interface Category {
  id: string;
  name: string;
  order: number;
  minAge: number | null;
  maxAge: number | null;
  isActive: boolean;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  categoryId: string;
  seasonId: string;
  category?: Category;
  season?: Season;
  _count?: { players: number };
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  sportName: string | null;
  birthDate: string;
  nationality: string | null;
  country: string | null;
  city: string | null;
  photoUrl: string | null;
  joinDate: string;
  exitDate: string | null;
  exitReason: string | null;
  currentTeamId: string | null;
  currentTeam?: Team | null;
  jerseyNumber: number | null;
  primaryPosition: PlayerPosition | string | null;
  dominantFoot: string | null;
  height: number | null;
  weight: number | null;
  status: string;
  notes: string | null;
  secondaryPositions?: { position: string }[];
  teamHistory?: {
    id: string;
    startDate: string;
    endDate: string | null;
    team: Team;
  }[];
}

export function calculateAge(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INJURED: "Lesionado",
  SUSPENDED: "Suspendido",
  INACTIVE: "Inactivo",
  LEFT_CLUB: "Fuera del club",
};

export const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  INJURED: "danger",
  SUSPENDED: "warning",
  INACTIVE: "neutral",
  LEFT_CLUB: "neutral",
};

export const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: "Arquero",
  CENTER_BACK: "Defensor central",
  FULL_BACK: "Lateral",
  DEFENSIVE_MIDFIELDER: "Volante defensivo",
  CENTRAL_MIDFIELDER: "Volante central",
  ATTACKING_MIDFIELDER: "Volante ofensivo",
  WINGER: "Extremo",
  STRIKER: "Delantero",
};
