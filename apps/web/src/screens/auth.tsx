/** @jsxImportSource octane */
import { useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { t } from "../i18n";
import { FieldError, FormError, FormHint, isEmail, requiredMessage } from "../components/form";

export function AuthScreen(props: { onAuthed: () => void | Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (mode === "login") {
      const loginErr = requiredMessage(login, "Username or email");
      if (loginErr) next.login = loginErr;
    } else {
      const nameErr = requiredMessage(displayName, "Display name");
      if (nameErr) next.displayName = nameErr;
      const emailErr = requiredMessage(email, "Email");
      if (emailErr) next.email = emailErr;
      else if (!isEmail(email)) next.email = "Enter a valid email address";
      const userErr = requiredMessage(username, "Username");
      if (userErr) next.username = userErr;
      else if (username.trim().length < 3) {
        next.username = "Username must be at least 3 characters";
      }
    }
    const passErr = requiredMessage(password, "Password");
    if (passErr) next.password = passErr;
    else if (password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: Event) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await (trpc as any).auth.login.mutate({
          login: login.trim(),
          password,
        });
        if (result?.token) localStorage.setItem("hydrox_token", result.token);
      } else {
        const result = await (trpc as any).auth.register.mutate({
          email: email.trim(),
          username: username.trim(),
          password,
          displayName: displayName.trim(),
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

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setFieldErrors({});
  }

  return (
    <div class="auth-screen" data-testid="auth-screen">
      <main class="auth-card">
        <div class="mb-5">
          <p class="hydrox-brand text-3xl text-foreground">{t("app.name")}</p>
          <p class="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>
        <form
          class="flex flex-col gap-3"
          onSubmit={submit as any}
          data-testid="auth-form"
          noValidate
        >
          {mode === "register" ? (
            <>
              <label class="control-field">
                <span class="control-label required">{t("auth.displayName")}</span>
                <input
                  class={"control" + (fieldErrors.displayName ? " is-invalid" : "")}
                  data-testid="auth-display-name"
                  autocomplete="name"
                  required
                  value={displayName}
                  onInput={(e: any) => {
                    setDisplayName(e.currentTarget.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.displayName;
                      return next;
                    });
                  }}
                />
                <FieldError message={fieldErrors.displayName} />
              </label>
              <label class="control-field">
                <span class="control-label required">{t("auth.email")}</span>
                <input
                  class={"control" + (fieldErrors.email ? " is-invalid" : "")}
                  data-testid="auth-email"
                  type="email"
                  autocomplete="email"
                  required
                  value={email}
                  onInput={(e: any) => {
                    setEmail(e.currentTarget.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.email;
                      return next;
                    });
                  }}
                />
                <FieldError message={fieldErrors.email} />
              </label>
              <label class="control-field">
                <span class="control-label required">{t("auth.username")}</span>
                <input
                  class={"control" + (fieldErrors.username ? " is-invalid" : "")}
                  data-testid="auth-username"
                  autocomplete="username"
                  required
                  minLength={3}
                  value={username}
                  onInput={(e: any) => {
                    setUsername(e.currentTarget.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.username;
                      return next;
                    });
                  }}
                />
                <FieldError message={fieldErrors.username} />
              </label>
            </>
          ) : (
            <label class="control-field">
              <span class="control-label required">
                {t("auth.username")} / {t("auth.email")}
              </span>
              <input
                class={"control" + (fieldErrors.login ? " is-invalid" : "")}
                data-testid="auth-login"
                autocomplete="username"
                required
                value={login}
                onInput={(e: any) => {
                  setLogin(e.currentTarget.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.login;
                    return next;
                  });
                }}
              />
              <FieldError message={fieldErrors.login} />
            </label>
          )}
          <label class="control-field">
            <span class="control-label required">{t("auth.password")}</span>
            <input
              class={"control" + (fieldErrors.password ? " is-invalid" : "")}
              type="password"
              data-testid="auth-password"
              autocomplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onInput={(e: any) => {
                setPassword(e.currentTarget.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.password;
                  return next;
                });
              }}
            />
            <FieldError message={fieldErrors.password} />
            {mode === "register" ? <FormHint>At least 8 characters.</FormHint> : null}
          </label>
          <FormError message={error} testId="auth-error" />
          <button
            class={buttonVariants.default}
            type="submit"
            data-testid="auth-submit"
            disabled={busy}
          >
            {busy ? "Please wait…" : mode === "login" ? t("auth.login") : t("auth.register")}
          </button>
        </form>
        <button
          class={buttonVariants.ghost + " mt-3 w-full"}
          type="button"
          data-testid="auth-toggle"
          onClick={switchMode}
        >
          {mode === "login" ? t("auth.register") : t("auth.login")}
        </button>
      </main>
    </div>
  );
}
