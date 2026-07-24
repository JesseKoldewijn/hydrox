/** @jsxImportSource octane */
import { createRoot } from "octane";
import { App } from "./app";
import { db } from "./lib/db";
import "@hydrox/ui/globals.css";
import "./styles.css";
import { initI18n } from "./i18n";
import { applyTheme, readTheme } from "./theme";

applyTheme(readTheme());
(window as unknown as { __hydroxDb?: unknown }).__hydroxDb = db;
void initI18n().then(() => {
  const el = document.getElementById("root");
  if (!el) throw new Error("Missing #root");
  createRoot(el).render(<App />);
});

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}
