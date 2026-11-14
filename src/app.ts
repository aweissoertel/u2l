import { Hono } from "hono";
import { fetchUgTab } from "./ug/fetch.ts";
import { UgError, type UgTab } from "./ug/types.ts";

export interface AppDeps {
  fetchTab: (url: string) => Promise<UgTab>;
}

// Platzhalter-Oberfläche, bis Formatter und Abschnitts-Editor fertig sind.
const INDEX_HTML = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>u2l – Ultimate Guitar → LaTeX</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 52rem; margin: 2rem auto; padding: 0 1rem; }
  form { display: flex; gap: .5rem; }
  input { flex: 1; padding: .5rem; font: inherit; }
  button { padding: .5rem 1rem; font: inherit; }
  pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; white-space: pre; }
  .error { color: #b00020; }
</style>
</head>
<body>
<h1>u2l</h1>
<form id="f">
  <input name="url" type="url" required placeholder="https://tabs.ultimate-guitar.com/tab/…">
  <button>Abrufen</button>
</form>
<p id="status"></p>
<pre id="out" hidden></pre>
<script>
  const f = document.getElementById("f"), out = document.getElementById("out"), status = document.getElementById("status");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Lade …"; status.className = ""; out.hidden = true;
    const res = await fetch("/api/ug", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: f.url.value }) });
    const data = await res.json();
    if (!res.ok) { status.textContent = data.error; status.className = "error"; return; }
    status.textContent = data.title + " – " + data.artist + (data.capo ? " (Capo " + data.capo + ")" : "");
    out.textContent = data.content; out.hidden = false;
  });
</script>
</body>
</html>`;

export function createApp(deps: AppDeps = { fetchTab: (url) => fetchUgTab(url) }) {
  const app = new Hono();

  app.get("/healthz", (c) => c.text("ok"));
  app.get("/", (c) => c.html(INDEX_HTML));

  app.post("/api/ug", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const url =
      typeof body === "object" && body !== null && "url" in body && typeof body.url === "string"
        ? body.url
        : null;
    if (!url) return c.json({ error: "Bitte einen Link angeben." }, 400);

    try {
      return c.json(await deps.fetchTab(url));
    } catch (error) {
      if (error instanceof UgError) return c.json({ error: error.message }, error.status);
      console.error(error);
      return c.json({ error: "Unerwarteter Fehler beim Abruf." }, 500);
    }
  });

  return app;
}
