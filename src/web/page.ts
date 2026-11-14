/**
 * Weboberfläche (eine Seite, ohne Build-Schritt). Ablauf:
 * Link abrufen → Abschnitts-Typen / Lagerfeuer-Akkorde / Ersetzungen anpassen → .tex herunterladen.
 * Alle Inhalte von UG werden per textContent eingesetzt (nie als HTML).
 */
export const INDEX_HTML = /* html */ `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>u2l – Ultimate Guitar → LaTeX</title>
<style>
  :root { --bg: #fff; --fg: #1d1d1f; --muted: #6e6e73; --line: #d2d2d7; --box: #f5f5f7; --accent: #0a66c2; --warn: #9a6700; --err: #b00020; }
  @media (prefers-color-scheme: dark) { :root { --bg: #161618; --fg: #f5f5f7; --muted: #a1a1a6; --line: #3a3a3c; --box: #232326; --accent: #4ea1ff; --warn: #e3b341; --err: #ff6b6b; } }
  * { box-sizing: border-box; }
  body { font: 16px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--fg); max-width: 64rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
  h1 { margin: 0 0 .25rem; font-size: 1.6rem; }
  h2 { font-size: 1.1rem; margin: 2rem 0 .5rem; }
  p.lead { margin: 0 0 1.25rem; color: var(--muted); }
  form { display: flex; gap: .5rem; flex-wrap: wrap; }
  input, select, button { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: .45rem .6rem; }
  input[type=url] { flex: 1 1 20rem; min-width: 0; }
  button { cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button:disabled { opacity: .5; cursor: default; }
  #status { min-height: 1.5rem; margin: .75rem 0 0; }
  .error { color: var(--err); }
  .warn { color: var(--warn); }
  .muted { color: var(--muted); }
  table { border-collapse: collapse; width: 100%; }
  td, th { text-align: left; padding: .35rem .5rem; border-bottom: 1px solid var(--line); vertical-align: middle; }
  th { font-weight: 600; font-size: .9rem; color: var(--muted); }
  td.preview { color: var(--muted); font-size: .9rem; overflow-wrap: anywhere; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: .5rem; }
  .chord { display: flex; align-items: center; gap: .4rem; padding: .35rem .5rem; border: 1px solid var(--line); border-radius: 6px; }
  .chord code { min-width: 3.5rem; font-weight: 600; }
  .chord input[type=text] { width: 5rem; }
  .chord label { font-size: .85rem; display: flex; align-items: center; gap: .2rem; }
  .actions { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin: 1rem 0 .5rem; }
  pre { background: var(--box); border: 1px solid var(--line); border-radius: 6px; padding: 1rem; overflow-x: auto; font-size: .85rem; line-height: 1.4; max-height: 70vh; }
  ul.warnings { margin: .5rem 0; padding-left: 1.25rem; }
</style>
</head>
<body>
<h1>u2l</h1>
<p class="lead">Ultimate-Guitar-Link einfügen, Abschnitte und Akkorde prüfen, .tex fürs Liederbuch herunterladen.</p>

<form id="fetch">
  <input name="url" type="url" required placeholder="https://tabs.ultimate-guitar.com/tab/…" aria-label="Link zu Ultimate Guitar">
  <button class="primary">Abrufen</button>
</form>
<p id="status" role="status"></p>

<div id="editor" hidden>
  <h2>Abschnitte</h2>
  <table>
    <thead><tr><th>Ultimate Guitar</th><th>Typ</th><th>Anfang</th></tr></thead>
    <tbody id="sections"></tbody>
  </table>

  <h2>Akkorde</h2>
  <label><input type="checkbox" id="simplify"> Lagerfeuer-Akkorde (ohne Bass-Töne, maj7, sus, Powerchords)</label>
  <p class="muted">Ersatz gilt für alle Stellen im Lied. ⚠ = kein Griffbild im Katalog.</p>
  <div class="grid" id="chords"></div>

  <h2>Ergebnis</h2>
  <ul class="warnings warn" id="warnings"></ul>
  <div class="actions">
    <button class="primary" id="download">Herunterladen</button>
    <button id="copy">Kopieren</button>
    <code id="filename" class="muted"></code>
  </div>
  <pre id="tex"></pre>
</div>

<script type="module">
  const TYPES = [
    ["verse", "Strophe"], ["verse*", "Strophe ungezählt"], ["instrumental", "Instrumental (nolyrics)"],
    ["bridge", "Bridge"], ["chorus", "Refrain"], ["omit", "– weglassen –"],
  ];
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  let tab = null;
  let result = null;
  const state = { simplify: false, sectionTypes: {}, replace: {} };

  function setStatus(text, cls = "") { $("status").textContent = text; $("status").className = cls; }

  async function post(url, body) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ error: "Ungültige Antwort vom Server." }));
    if (!res.ok) throw new Error(data.error ?? "Fehler " + res.status);
    return data;
  }

  $("fetch").addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Lade von Ultimate Guitar …");
    $("editor").hidden = true;
    try {
      tab = await post("/api/ug", { url: e.target.url.value });
      Object.assign(state, { simplify: false, sectionTypes: {}, replace: {} });
      $("simplify").checked = false;
      await convert({ rebuild: true });
      setStatus(tab.title + " – " + tab.artist + (tab.capo ? " · Capo " + tab.capo : ""));
      $("editor").hidden = false;
    } catch (err) {
      setStatus(err.message, "error");
    }
  });

  let pending = 0;
  async function convert({ rebuild = false, rebuildChords = false } = {}) {
    const ticket = ++pending;
    const data = await post("/api/convert", { tab, options: state });
    if (ticket !== pending) return; // veraltete Antwort
    result = data;
    if (rebuild) renderSections();
    if (rebuild || rebuildChords) renderChords();
    $("tex").textContent = data.tex;
    $("filename").textContent = data.filename;
    $("warnings").replaceChildren(...data.warnings.map((w) => el("li", { textContent: w })));
  }

  function renderSections() {
    $("sections").replaceChildren(...result.sections.map((s) => {
      const select = el("select", { ariaLabel: "Typ für " + (s.name || "Abschnitt " + (s.index + 1)) },
        ...TYPES.map(([value, label]) => el("option", { value, textContent: label + (value === s.guess ? " (Vorschlag)" : ""), selected: value === s.type })));
      select.addEventListener("change", () => { state.sectionTypes[s.index] = select.value; convert().catch(showError); });
      return el("tr", {},
        el("td", { textContent: s.name || "(ohne Überschrift)" }),
        el("td", {}, select),
        el("td", { className: "preview", textContent: s.preview }));
    }));
  }

  function renderChords() {
    $("chords").replaceChildren(...result.chords.map((c) => {
      const current = state.replace[c.name];
      const input = el("input", { type: "text", placeholder: "Ersatz", value: current ?? "", disabled: current === "", ariaLabel: "Ersatz für " + c.name });
      const remove = el("input", { type: "checkbox", checked: current === "" });
      const update = () => {
        if (remove.checked) state.replace[c.name] = "";
        else if (input.value.trim()) state.replace[c.name] = input.value.trim();
        else delete state.replace[c.name];
        input.disabled = remove.checked;
        convert().catch(showError);
      };
      input.addEventListener("input", debounce(update, 300));
      remove.addEventListener("change", update);
      return el("div", { className: "chord", title: c.inCatalog ? "" : "Kein Griffbild im Katalog" },
        el("code", { textContent: c.name + (c.inCatalog ? "" : " ⚠") }),
        el("span", { className: "muted", textContent: "×" + c.count }),
        input,
        el("label", {}, remove, "weg"));
    }));
  }

  $("simplify").addEventListener("change", (e) => {
    state.simplify = e.target.checked;
    state.replace = {}; // Akkordnamen ändern sich – Ersetzungen passen nicht mehr
    convert({ rebuildChords: true }).catch(showError);
  });

  $("download").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([result.tex], { type: "application/x-tex;charset=utf-8" }));
    const a = el("a", { href: url, download: result.filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(result.tex);
    $("copy").textContent = "Kopiert ✓";
    setTimeout(() => ($("copy").textContent = "Kopieren"), 1500);
  });

  function showError(err) { setStatus(err.message, "error"); }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
</script>
</body>
</html>`;
