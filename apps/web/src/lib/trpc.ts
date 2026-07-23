import {
  createTRPCProxyClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

/**
 * Browser HTTP/SSE base URL.
 * Empty → same-origin `/trpc` (Vite proxies in dev).
 * In Docker Compose, set `VITE_API_URL=http://localhost:3001` so the browser
 * hits the published API port (container DNS names are not reachable from the host browser).
 */
const apiUrl = import.meta.env.VITE_API_URL ?? "";

/**
 * Untyped client until @generated AppRouter is produced by the API.
 * Procedures match Nest routers: health, auth, sync, work, notify, admin.
 *
 * Subscriptions use HTTP SSE (`httpSubscriptionLink`) because
 * `@nest-native/trpc` mounts fetch HTTP handlers only — not a WebSocket server.
 */
export type HydroxRouter = AnyRouter;

function authHeaders(): HeadersInit {
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("hydrox_token")
      : null;
  return token ? { authorization: `Bearer ${token}` } : {};
}

function connectionParams(): Record<string, string> {
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("hydrox_token")
      : null;
  return token ? { token } : {};
}

export const trpc = createTRPCProxyClient<HydroxRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "subscription",
      true: httpSubscriptionLink({
        url: `${apiUrl}/trpc`,
        // EventSource cannot set Authorization; pass session via connectionParams.
        connectionParams,
        eventSourceOptions: { withCredentials: true },
      }),
      false: httpBatchLink({
        url: `${apiUrl}/trpc`,
        fetch: fetchWithCreds,
      }),
    }),
  ],
});

function fetchWithCreds(url: RequestInfo | URL, opts?: RequestInit) {
  const headers = new Headers(opts?.headers);
  for (const [k, v] of Object.entries(authHeaders())) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return fetch(url, { ...opts, headers, credentials: "include" });
}
