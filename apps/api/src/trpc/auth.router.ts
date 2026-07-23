import { Injectable } from "@nestjs/common";
import { Input, Mutation, Query, Router, TrpcContext } from "@nest-native/trpc";
import { z } from "zod";
import {
  loginInputSchema,
  registerInputSchema,
  sessionUserSchema,
} from "@hydrox/contracts";
import { AuthService } from "../auth/auth.service.js";
import { WorkosService } from "../auth/workos.service.js";
import {
  SESSION_COOKIE,
  extractToken,
  type TrpcContext as Ctx,
} from "./context.js";

@Router("auth")
@Injectable()
export class AuthRouter {
  constructor(
    private readonly auth: AuthService,
    private readonly workos: WorkosService,
  ) {}

  @Mutation({ input: registerInputSchema })
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
    return result.user;
  }

  @Mutation({ input: loginInputSchema })
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
    return result.user;
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

  @Query({
    output: z.object({
      enabled: z.boolean(),
      url: z.string().nullable(),
    }),
  })
  workosLoginUrl() {
    if (!this.workos.isEnabled()) {
      return { enabled: false, url: null };
    }
    return { enabled: true, url: this.workos.getAuthorizationUrl() };
  }

  @Mutation({
    input: z.object({ code: z.string() }),
  })
  async workosCallback(
    @Input() input: { code: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!this.workos.isEnabled()) {
      throw new Error("WorkOS is not enabled");
    }
    const result = await this.workos.authenticateWithCode(input.code);
    const auth = await this.auth.upsertWorkosUser({
      workosUserId: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      workosOrganizationId: result.organizationId ?? null,
    });
    ctx.res.setCookie?.(SESSION_COOKIE, auth.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 14 * 86400,
    });
    return auth.user;
  }
}
