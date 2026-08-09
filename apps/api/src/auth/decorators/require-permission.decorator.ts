import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "@futboljoven/shared";

export const PERMISSIONS_KEY = "required_permissions";

/**
 * Marks an endpoint as requiring one or more permissions. The
 * PermissionsGuard checks the caller's role against these — enforced in
 * the backend regardless of what the frontend shows or hides.
 */
export const RequirePermission = (...permissions: PermissionKey[]) => SetMetadata(PERMISSIONS_KEY, permissions);
