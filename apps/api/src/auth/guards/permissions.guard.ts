import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PermissionKey } from "@futboljoven/shared";
import { PERMISSIONS_KEY } from "../decorators/require-permission.decorator";
import type { AuthenticatedUser } from "../auth.types";

/**
 * Enforces permissions server-side. Must run after JwtAuthGuard so
 * request.user is already populated. Requires the caller to have AT LEAST
 * ONE of the permissions declared with @RequirePermission — endpoints that
 * accept either a "view all" or a "view assigned" permission use this to
 * let both roles in, while row-level scoping (done in the service layer)
 * narrows what "assigned" actually returns.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException("No autenticado");
    }

    const hasPermission = required.some((permission) => user.permissions.includes(permission));
    if (!hasPermission) {
      throw new ForbiddenException("No tenés permisos para realizar esta acción");
    }

    return true;
  }
}
