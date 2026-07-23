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
  const [workos, setWorkos] = useState<{ enabled: boolean; url: string | null } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (trpc as any).auth.workosLoginUrl
      .query()
      .then((r: any) => setWorkos(r))
      .catch(() => setWorkos({ enabled: false, url: null }));
  }, []);

  async function submit(e: Event) {
    e.preventDefault();
    setError(null);
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="auth-screen" data-testid="auth-screen">
      <main class="auth-card">
        <div class="mb-5">
          <p class="hydrox-brand text-3xl text-foreground">{t("app.name")}</p>
          <p class="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>
        <form class="flex flex-col gap-3" onSubmit={submit as any} data-testid="auth-form">
          {mode === "register" ? (
            <>
              <label class="field">
                {t("auth.displayName")}
                <input
                  data-testid="auth-display-name"
                  value={displayName}
                  onInput={(e: any) => setDisplayName(e.currentTarget.value)}
                />
              </label>
              <label class="field">
                {t("auth.email")}
                <input
                  data-testid="auth-email"
                  value={email}
                  onInput={(e: any) => setEmail(e.currentTarget.value)}
                />
              </label>
              <label class="field">
                {t("auth.username")}
                <input
                  data-testid="auth-username"
                  value={username}
                  onInput={(e: any) => setUsername(e.currentTarget.value)}
                />
              </label>
            </>
          ) : (
            <label class="field">
              {t("auth.username")} / {t("auth.email")}
              <input
                data-testid="auth-login"
                value={login}
                onInput={(e: any) => setLogin(e.currentTarget.value)}
              />
            </label>
          )}
          <label class="field">
            {t("auth.password")}
            <input
              type="password"
              data-testid="auth-password"
              value={password}
              onInput={(e: any) => setPassword(e.currentTarget.value)}
            />
          </label>
          {error ? (
            <p class="text-sm text-destructive" data-testid="auth-error">
              {error as string}
            </p>
          ) : null}
          <button
            class={buttonVariants.default}
            type="submit"
            data-testid="auth-submit"
            disabled={busy}
          >
            {mode === "login" ? t("auth.login") : t("auth.register")}
          </button>
        </form>
        <button
          class={buttonVariants.ghost + " mt-3 w-full"}
          type="button"
          data-testid="auth-toggle"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? t("auth.register") : t("auth.login")}
        </button>
        {workos?.enabled && workos.url ? (
          <a class={buttonVariants.secondary + " mt-2 w-full"} href={workos.url}>
            Continue with WorkOS
          </a>
        ) : null}
      </main>
    </div>
  );
}
