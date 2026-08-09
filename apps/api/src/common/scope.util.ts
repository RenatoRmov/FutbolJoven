import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@futboljoven/shared";
import type { AuthenticatedUser } from "../auth/auth.types";

/**
 * Row-level scoping used by services that expose both a "view/edit all"
 * and a "view/edit assigned" permission (players, evaluations, dashboard).
 * The frontend never decides this — every query is filtered here so a
 * coach genuinely cannot read/write data outside their assigned teams,
 * even by calling the API directly.
 */
export function resolveTeamScope(
  user: AuthenticatedUser,
  allPermission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  assignedPermission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
): { teamIdIn?: string[] } {
  if (user.permissions.includes(allPermission)) {
    return {};
  }
  if (user.permissions.includes(assignedPermission)) {
    if (user.teamIds.length === 0) {
      // Has the "assigned" permission but no teams assigned yet — sees nothing.
      return { teamIdIn: ["__none__"] };
    }
    return { teamIdIn: user.teamIds };
  }
  throw new ForbiddenException("No tenés permisos para realizar esta acción");
}

export function assertTeamInScope(user: AuthenticatedUser, teamId: string, allPermission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS], assignedPermission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  if (user.permissions.includes(allPermission)) return;
  if (user.permissions.includes(assignedPermission) && user.teamIds.includes(teamId)) return;
  throw new ForbiddenException("No tenés acceso a este equipo");
}
