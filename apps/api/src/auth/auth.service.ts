import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { JwtAccessPayload, JwtRefreshPayload } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsCacheService } from "./permissions-cache.service";

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenMaxAgeMs: number;
  refreshTokenMaxAgeMs: number;
}

function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 15 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private permissionsCache: PermissionsCacheService,
  ) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }
    return user;
  }

  async issueTokens(userId: string): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const accessPayload: JwtAccessPayload = { sub: user.id, roleId: user.roleId, type: "access" };
    const accessTtl = process.env.JWT_ACCESS_TTL ?? "15m";
    const accessToken = this.jwt.sign(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: accessTtl,
    });

    const jti = randomUUID();
    const refreshTtl = process.env.JWT_REFRESH_TTL ?? "7d";
    const refreshTokenMaxAgeMs = parseDurationMs(refreshTtl);
    const refreshPayload: JwtRefreshPayload = { sub: user.id, jti, type: "refresh" };
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: refreshTtl,
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
      },
    });

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      accessToken,
      refreshToken,
      accessTokenMaxAgeMs: parseDurationMs(accessTtl),
      refreshTokenMaxAgeMs,
    };
  }

  async refreshTokens(refreshToken: string): Promise<IssuedTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwt.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException("Sesión expirada, iniciá sesión nuevamente");
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Sesión inválida, iniciá sesión nuevamente");
    }

    const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
    if (!matches) {
      throw new UnauthorizedException("Sesión inválida, iniciá sesión nuevamente");
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    return this.issueTokens(stored.userId);
  }

  async revokeRefreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtRefreshPayload>(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Token already invalid/expired — nothing to revoke.
    }
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always respond the same way whether or not the email exists, to avoid
    // leaking which emails are registered.
    if (user) {
      const resetToken = randomUUID();
      // Dev stub: no email provider wired up yet — log the link so the flow
      // is testable end-to-end. Wire a real provider before production.
      this.logger.log(`[DEV] Password reset link for ${email}: /reset-password?token=${resetToken}&uid=${user.id}`);
    }
    return { message: "Si el email existe, se envió un enlace de recuperación." };
  }

  async registerFirstAdminIfNeeded() {
    const existing = await this.prisma.user.count();
    if (existing > 0) {
      throw new ConflictException("El sistema ya tiene usuarios configurados");
    }
  }

  invalidatePermissionsCache(roleId?: string) {
    this.permissionsCache.invalidate(roleId);
  }
}
