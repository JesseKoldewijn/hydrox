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
  url?: string;
}): string | undefined {
  const cookie = ctx.cookies?.[SESSION_COOKIE];
  if (cookie) return cookie;
  const auth = ctx.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return tokenFromConnectionParams(ctx.url ?? headerString(ctx.headers, "x-forwarded-uri"));
}

function headerString(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const v = headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/** tRPC httpSubscriptionLink sends `{ token }` as `?connectionParams=...`. */
export function tokenFromConnectionParams(urlOrPath?: string): string | undefined {
  if (!urlOrPath) return undefined;
  try {
    const u = new URL(urlOrPath, "http://localhost");
    const raw = u.searchParams.get("connectionParams");
    if (!raw) return undefined;
    const params = JSON.parse(raw) as { token?: unknown };
    return typeof params.token === "string" && params.token ? params.token : undefined;
  } catch {
    return undefined;
  }
}
