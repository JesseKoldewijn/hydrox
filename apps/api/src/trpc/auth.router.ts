import { Inject, Injectable } from "@nestjs/common";
import { Input, Mutation, Query, Router, TrpcContext } from "@nest-native/trpc";
import { z } from "zod";
import {
  loginInputSchema,
  registerInputSchema,
  sessionUserSchema,
} from "@hydrox/contracts";
import { AuthService } from "../auth/auth.service.js";
import {
  SESSION_COOKIE,
  extractToken,
  type TrpcContext as Ctx,
} from "./context.js";

@Router("auth")
@Injectable()
export class AuthRouter {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Mutation({
    input: registerInputSchema,
    output: z.object({
      user: sessionUserSchema,
      token: z.string(),
    }),
  })
  async register(
    @Input() input: z.infer<typeof registerInputSchema>,
    @TrpcContext() ctx: Ctx,
  ) {
    const result = await this.auth.register(input);
    ctx.res.setCookie?.(SESSION_COOKIE, result.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 14 * 86400,
    });
    return { user: result.user, token: result.token };
  }

  @Mutation({
    input: loginInputSchema,
    output: z.object({
      user: sessionUserSchema,
      token: z.string(),
    }),
  })
  async login(
    @Input() input: z.infer<typeof loginInputSchema>,
    @TrpcContext() ctx: Ctx,
  ) {
    const result = await this.auth.login(input);
    ctx.res.setCookie?.(SESSION_COOKIE, result.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 14 * 86400,
    });
    return { user: result.user, token: result.token };
  }

  @Mutation()
  async logout(@TrpcContext() ctx: Ctx) {
    const token = extractToken(ctx.req);
    if (token) await this.auth.logout(token);
    ctx.res.clearCookie?.(SESSION_COOKIE);
    return { ok: true as const };
  }

  @Query({ output: sessionUserSchema.nullable() })
  async me(@TrpcContext() ctx: Ctx) {
    return ctx.user;
  }
}
