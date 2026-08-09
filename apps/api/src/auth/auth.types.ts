import type { PermissionKey } from "@futboljoven/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleKey: string;
  permissions: PermissionKey[];
  /** Team ids this user is scoped to (relevant for COACH-style roles). */
  teamIds: string[];
}
