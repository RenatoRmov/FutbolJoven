import type { PlayerPosition, TalentStatus } from "@futboljoven/shared";
import { PLAYER_GENDER_LABELS, PLAYER_POSITION_LABELS, TALENT_STATUS_LABELS, HEALTH_SYSTEM_LABELS, POSITION_GROUPS, POSITION_GROUP_LABELS, groupForPosition } from "@futboljoven/shared";

export { HEALTH_SYSTEM_LABELS, POSITION_GROUPS, POSITION_GROUP_LABELS, groupForPosition };

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
  gender: string | null;
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
  documentId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  healthSystem: string | null;
  isapreName: string | null;
  fonasaTramo: string | null;
  allergies: string | null;
  chronicDiseases: string | null;
  permanentMedications: string | null;
  relevantPreviousInjuries: string | null;
  bloodType: string | null;
  medicalObservations: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactPhoneAlt: string | null;
  emergencyContactAddress: string | null;
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

export const POSITION_LABELS: Record<string, string> = PLAYER_POSITION_LABELS;
export const GENDER_LABELS: Record<string, string> = PLAYER_GENDER_LABELS;

export const ESTATUS_LABELS: Record<string, string> = TALENT_STATUS_LABELS;

export const ESTATUS_TONE: Record<TalentStatus, "success" | "info" | "warning" | "danger" | "neutral"> = {
  PROYECTADO: "success",
  PROYECTABLE: "info",
  EN_DESARROLLO: "warning",
  LIMITADO: "warning",
  NO_APTO: "danger",
};
