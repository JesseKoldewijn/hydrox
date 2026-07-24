/** @jsxImportSource octane */
import { createContext, useContext, useEffect, useState } from "octane";
import type { OctaneNode } from "octane";
import { trpc } from "./trpc";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type SessionValue = {
  status: "loading" | "ready";
  user: SessionUser | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider(props: { children?: OctaneNode }) {
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

  return (
    <SessionContext.Provider value={{ status, user, refresh, logout }}>
      {props.children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used under SessionProvider");
  }
  return value;
}
