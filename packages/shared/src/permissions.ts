/**
 * Canonical permission keys. Permissions live as rows in the database
 * (see Permission/RolePermission in the Prisma schema) so an admin can
 * assign them to custom roles later — this list is only the seed/reference
 * set the backend guards check against.
 */
export const PERMISSIONS = {
  SYSTEM_CONFIGURE: "system.configure",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  SEASONS_MANAGE: "seasons.manage",
  CATEGORIES_MANAGE: "categories.manage",
  TEAMS_MANAGE: "teams.manage",

  PLAYERS_VIEW_ALL: "players.view.all",
  PLAYERS_VIEW_ASSIGNED: "players.view.assigned",
  PLAYERS_CREATE: "players.create",
  PLAYERS_EDIT_ALL: "players.edit.all",
  PLAYERS_EDIT_ASSIGNED: "players.edit.assigned",
  PLAYERS_DELETE: "players.delete",

  EVALUATIONS_VIEW_ALL: "evaluations.view.all",
  EVALUATIONS_VIEW_ASSIGNED: "evaluations.view.assigned",
  EVALUATIONS_CREATE_ALL: "evaluations.create.all",
  EVALUATIONS_CREATE_ASSIGNED: "evaluations.create.assigned",
  EVALUATIONS_CONFIG_MANAGE: "evaluations.config.manage",

  DASHBOARD_VIEW_GLOBAL: "dashboard.view.global",
  DASHBOARD_VIEW_ASSIGNED: "dashboard.view.assigned",

  AUDIT_VIEW: "audit.view",

  NUTRITION_VIEW: "nutrition.view",
  NUTRITION_MANAGE: "nutrition.manage",
  PHYSICAL_VIEW: "physical.view",
  PHYSICAL_MANAGE: "physical.manage",
  PLAYERS_DOCUMENTS_VIEW: "players.documents.view",
  PLAYERS_DOCUMENTS_MANAGE: "players.documents.manage",

  // Reserved for future phases — permissions already exist so RBAC checks
  // can be wired without a schema change when the modules are built.
  REPORTS_GENERATE: "reports.generate",
  DATA_EXPORT: "data.export",
  DATA_IMPORT: "data.import",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

/** System (non-deletable) roles seeded on first run. Admins can add more roles later. */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  DIRECTOR: "DIRECTOR",
  COORDINATOR: "COORDINATOR",
  COACH: "COACH",
  NUTRITIONIST: "NUTRITIONIST",
  PHYSICAL_TRAINER: "PHYSICAL_TRAINER",
  SCOUT: "SCOUT",
} as const;

export type SystemRoleKey = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

const P = PERMISSIONS;

/** Default permission grants per seeded role — used only by the seed script. */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleKey, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  DIRECTOR: [
    P.PLAYERS_VIEW_ALL,
    P.EVALUATIONS_VIEW_ALL,
    P.DASHBOARD_VIEW_GLOBAL,
    P.AUDIT_VIEW,
    P.NUTRITION_VIEW,
    P.PHYSICAL_VIEW,
    P.REPORTS_GENERATE,
    P.DATA_EXPORT,
    P.PLAYERS_DOCUMENTS_VIEW,
  ],
  COORDINATOR: [
    P.PLAYERS_VIEW_ALL,
    P.PLAYERS_EDIT_ALL,
    P.EVALUATIONS_VIEW_ALL,
    P.EVALUATIONS_CREATE_ALL,
    P.DASHBOARD_VIEW_GLOBAL,
    P.REPORTS_GENERATE,
    P.PLAYERS_DOCUMENTS_VIEW,
    P.PLAYERS_DOCUMENTS_MANAGE,
  ],
  COACH: [
    P.PLAYERS_VIEW_ASSIGNED,
    P.PLAYERS_EDIT_ASSIGNED,
    P.EVALUATIONS_VIEW_ASSIGNED,
    P.EVALUATIONS_CREATE_ASSIGNED,
    P.DASHBOARD_VIEW_ASSIGNED,
  ],
  NUTRITIONIST: [
    P.PLAYERS_VIEW_ALL,
    P.NUTRITION_VIEW,
    P.NUTRITION_MANAGE,
    P.DASHBOARD_VIEW_ASSIGNED,
  ],
  PHYSICAL_TRAINER: [
    P.PLAYERS_VIEW_ALL,
    P.PHYSICAL_VIEW,
    P.PHYSICAL_MANAGE,
    P.DASHBOARD_VIEW_ASSIGNED,
  ],
  SCOUT: [P.PLAYERS_VIEW_ALL, P.EVALUATIONS_VIEW_ALL, P.DASHBOARD_VIEW_ASSIGNED],
};
