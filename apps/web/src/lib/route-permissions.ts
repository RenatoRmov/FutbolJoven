import { PERMISSIONS } from "@futboljoven/shared";
import type { PermissionKey } from "@futboljoven/shared";

const P = PERMISSIONS;

/**
 * Single source of truth for "who can even open this screen." Sidebar.tsx
 * uses the same permission keys to decide which links to show, but hiding a
 * link never stopped someone from typing the URL directly — every route
 * that maps here is enforced by AppLayout regardless of how it was reached.
 * Order matters: first matching prefix wins, so a more specific prefix
 * (e.g. "/admin/users") must come before a broader one that would also
 * match it.
 */
export const ROUTE_PERMISSIONS: { prefix: string; perms: PermissionKey[] }[] = [
  { prefix: "/dashboard", perms: [P.DASHBOARD_VIEW_GLOBAL, P.DASHBOARD_VIEW_ASSIGNED] },
  { prefix: "/player-profile", perms: [P.PLAYERS_CREATE] },
  { prefix: "/players", perms: [P.PLAYERS_VIEW_ALL, P.PLAYERS_VIEW_ASSIGNED] },
  { prefix: "/medical", perms: [P.PHYSICAL_VIEW, P.PHYSICAL_MANAGE] },
  { prefix: "/evaluations", perms: [P.EVALUATIONS_VIEW_ALL, P.EVALUATIONS_VIEW_ASSIGNED] },
  { prefix: "/physical-performance", perms: [P.PHYSICAL_VIEW, P.PHYSICAL_MANAGE] },
  { prefix: "/fixtures", perms: [P.FIXTURES_VIEW_ALL, P.FIXTURES_VIEW_ASSIGNED] },
  { prefix: "/finance", perms: [P.FINANCE_VIEW, P.FINANCE_MANAGE] },
  { prefix: "/inventory", perms: [P.INVENTORY_VIEW, P.INVENTORY_MANAGE] },
  { prefix: "/audit", perms: [P.AUDIT_VIEW] },
  { prefix: "/import-export", perms: [P.DATA_IMPORT, P.DATA_EXPORT] },
  { prefix: "/admin/users", perms: [P.USERS_MANAGE] },
  { prefix: "/admin/roles", perms: [P.ROLES_MANAGE] },
  { prefix: "/admin/categories", perms: [P.CATEGORIES_MANAGE] },
  { prefix: "/admin/seasons", perms: [P.SEASONS_MANAGE] },
  { prefix: "/admin/teams", perms: [P.TEAMS_MANAGE] },
];

/** Returns the permissions required for a pathname, or null if the route isn't gated (e.g. /login). */
export function permissionsForRoute(pathname: string): PermissionKey[] | null {
  const match = ROUTE_PERMISSIONS.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return match ? match.perms : null;
}
