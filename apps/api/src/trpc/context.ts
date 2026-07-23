import type { AuthService } from "../auth/auth.service.js";
import type { SessionUser } from "../auth/auth.types.js";

export type TrpcContext = {
  req: {
    headers: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string>;
  };
  res: {
    setCookie?: (name: string, value: string, opts?: Record<string, unknown>) => void;
    clearCookie?: (name: string) => void;
  };
  user: SessionUser | null;
  auth: AuthService;
};

export const SESSION_COOKIE = "hydrox_session";

export function extractToken(ctx: {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
}): string | undefined {
  const cookie = ctx.cookies?.[SESSION_COOKIE];
  if (cookie) return cookie;
  const auth = ctx.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return undefined;
}
