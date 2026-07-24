export type ThemeMode = "system" | "light" | "dark";

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && preferDark);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  localStorage.setItem("hydrox-theme", mode);
}

export function readTheme(): ThemeMode {
  const v = localStorage.getItem("hydrox-theme");
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function watchSystemTheme() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (readTheme() === "system") applyTheme("system");
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
