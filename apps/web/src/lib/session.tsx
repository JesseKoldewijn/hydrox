/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { trpc } from "./trpc";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function useSession() {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  async function refresh() {
    try {
      const me = (await (trpc as any).auth.me.query()) as SessionUser | null;
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setStatus("ready");
    }
  }

  async function logout() {
    await (trpc as any).auth.logout.mutate();
    localStorage.removeItem("hydrox_token");
    setUser(null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { status, user, refresh, logout };
}
