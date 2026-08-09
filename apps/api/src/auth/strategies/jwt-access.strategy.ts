import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import type { JwtAccessPayload } from "@futboljoven/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { PermissionsCacheService } from "../permissions-cache.service";
import type { AuthenticatedUser } from "../auth.types";

function extractFromCookie(req: Request): string | null {
  return req?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private prisma: PrismaService,
    private permissionsCache: PermissionsCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractFromCookie, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Token inválido");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, teamAssignments: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario no encontrado o inactivo");
    }

    const permissions = await this.permissionsCache.getPermissionsForRole(user.roleId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleKey: user.role.key,
      permissions,
      teamIds: user.teamAssignments.map((a) => a.teamId),
    };
  }
}
