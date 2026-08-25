import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema } from "@futboljoven/shared";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AuthenticatedUser } from "./auth.types";

const isProd = process.env.NODE_ENV === "production";
// The frontend proxies /api/* through Vercel rewrites (see vercel.json), so
// the browser only ever talks to the Vercel origin — cookies are first-party
// there even though Vercel and Railway are different registrable domains.
// "Lax" works in both dev (localhost) and prod (proxied) since neither is a
// genuine cross-site fetch from the browser's point of view.
const cookieSameSite = "lax";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string, accessMaxAge: number, refreshMaxAge: number) {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: cookieSameSite,
    maxAge: accessMaxAge,
    path: "/",
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: cookieSameSite,
    maxAge: refreshMaxAge,
    path: "/api/auth",
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth" });
}

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateCredentials(body.email, body.password);
    const tokens = await this.authService.issueTokens(user.id);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.accessTokenMaxAgeMs, tokens.refreshTokenMaxAgeMs);
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      clearAuthCookies(res);
      return { message: "No hay sesión activa" };
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.accessTokenMaxAgeMs, tokens.refreshTokenMaxAgeMs);
    return { message: "ok" };
  }

  @Public()
  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
    clearAuthCookies(res);
    return { message: "ok" };
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
