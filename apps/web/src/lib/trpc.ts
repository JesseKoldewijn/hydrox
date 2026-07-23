import {
  createTRPCProxyClient,
  httpBatchLink,
  createWSClient,
  wsLink,
  splitLink,
} from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

const apiUrl = import.meta.env.VITE_API_URL ?? "";
const wsUrl =
  import.meta.env.VITE_WS_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/trpc`
    : "ws://localhost:3001/trpc");

/**
 * Untyped client until @generated AppRouter is produced by the API.
 * Procedures match Nest routers: health, auth, sync, work, notify, admin.
 */
export type HydroxRouter = AnyRouter;

const wsClient =
  typeof window !== "undefined"
    ? createWSClient({ url: wsUrl })
    : null;

export const trpc = createTRPCProxyClient<HydroxRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "subscription",
      true: wsClient
        ? wsLink({ client: wsClient })
        : httpBatchLink({ url: `${apiUrl}/trpc`, fetch: fetchWithCreds }),
      false: httpBatchLink({
        url: `${apiUrl}/trpc`,
        fetch: fetchWithCreds,
      }),
    }),
  ],
});

function fetchWithCreds(url: RequestInfo | URL, opts?: RequestInit) {
  const headers = new Headers(opts?.headers);
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("hydrox_token")
      : null;
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...opts, headers, credentials: "include" });
}
