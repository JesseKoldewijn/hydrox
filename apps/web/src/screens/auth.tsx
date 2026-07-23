/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { t } from "../i18n";

export function AuthScreen(props: { onAuthed: () => void | Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [workos, setWorkos] = useState<{ enabled: boolean; url: string | null } | null>(null);

  useEffect(() => {
    void (trpc as any).auth.workosLoginUrl
      .query()
      .then((r: any) => setWorkos(r))
      .catch(() => setWorkos({ enabled: false, url: null }));
  }, []);

  async function submit(e: Event) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        const result = await (trpc as any).auth.login.mutate({ login, password });
        if (result?.token) localStorage.setItem("hydrox_token", result.token);
      } else {
        const result = await (trpc as any).auth.register.mutate({
          email,
          username,
          password,
          displayName,
        });
        if (result?.token) localStorage.setItem("hydrox_token", result.token);
      }
      await props.onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  }

  return (
    <div class="hydrox-shell">
      <main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
        <div>
          <p class="hydrox-brand text-5xl font-bold text-primary">{t("app.name")}</p>
          <p class="mt-2 text-muted-foreground">{t("app.tagline")}</p>
        </div>
        <form class="flex flex-col gap-3 rounded-lg border border-border bg-card p-5" onSubmit={submit as any}>
          {mode === "register" ? (
            <>
              <label class="text-sm">
                {t("auth.displayName")}
                <input
                  class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                  value={displayName}
                  onInput={(e: any) => setDisplayName(e.currentTarget.value)}
                />
              </label>
              <label class="text-sm">
                {t("auth.email")}
                <input
                  class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                  value={email}
                  onInput={(e: any) => setEmail(e.currentTarget.value)}
                />
              </label>
              <label class="text-sm">
                {t("auth.username")}
                <input
                  class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                  value={username}
                  onInput={(e: any) => setUsername(e.currentTarget.value)}
                />
              </label>
            </>
          ) : (
            <label class="text-sm">
              {t("auth.username")} / {t("auth.email")}
              <input
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                value={login}
                onInput={(e: any) => setLogin(e.currentTarget.value)}
              />
            </label>
          )}
          <label class="text-sm">
            {t("auth.password")}
            <input
              type="password"
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={password}
              onInput={(e: any) => setPassword(e.currentTarget.value)}
            />
          </label>
          {error ? <p class="text-sm text-destructive">{error as string}</p> : null}
          <button class={buttonVariants.default} type="submit">
            {mode === "login" ? t("auth.login") : t("auth.register")}
          </button>
        </form>
        <button
          class={buttonVariants.ghost}
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? t("auth.register") : t("auth.login")}
        </button>
        {workos?.enabled && workos.url ? (
          <a class={buttonVariants.secondary} href={workos.url}>
            Continue with WorkOS
          </a>
        ) : null}
      </main>
    </div>
  );
}
