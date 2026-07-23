import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * SSG shell writer (stable layout + skeleton placeholders to avoid CLS).
 * Full Octane prerender can be wired when the app exposes a server entry;
 * this script always emits a deterministic shell for static hosting.
 */
async function main() {
  const html = `<div class="hydrox-shell" data-ssg="1">
  <header style="height:57px;border-bottom:1px solid var(--border)"></header>
  <main style="max-width:80rem;margin:0 auto;padding:1rem">
    <div class="animate-pulse" style="height:2rem;width:12rem;background:var(--muted);border-radius:0.5rem;margin-bottom:1rem"></div>
    <div class="animate-pulse" style="height:18rem;background:var(--muted);border-radius:0.5rem"></div>
  </main>
</div>`;

  const outDir = resolve("dist-ssg");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Hydrox</title></head><body><div id="root">${html}</div><script type="module" src="/assets/index.js"></script></body></html>`,
  );
  console.log("SSG shell written to dist-ssg/index.html");
}

main().catch((err) => {
  console.warn("SSG shell skipped:", err instanceof Error ? err.message : err);
  process.exit(0);
});
