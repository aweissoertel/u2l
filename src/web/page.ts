import { SONGBOOKS } from "../latex/songbooks.ts";

/**
 * Weboberfläche (eine Seite, ohne Build-Schritt, ohne externe Ressourcen). Ablauf:
 * Link abrufen → Abschnitts-Typen / Lagerfeuer-Akkorde / Ersetzungen anpassen → .tex herunterladen.
 *
 * Sicherheit: Alle Inhalte von UG und vom Server werden per textContent eingesetzt (nie als HTML).
 * String.raw, damit Backslashes in Regexen im Client-Skript erhalten bleiben – im Skript daher
 * keine Backticks und keine `${…}` außer der einen gewollten Einfügung (BOOKS).
 */
export const INDEX_HTML = String.raw`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0a0a12">
<title>u2l – Ultimate Guitar → LaTeX</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%238b5cf6'/%3E%3Cstop offset='.55' stop-color='%23ec4899'/%3E%3Cstop offset='1' stop-color='%23f59e0b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M16 3c7 0 12 3 12 8 0 7-7 15-12 18C11 26 4 18 4 11c0-5 5-8 12-8z' fill='url(%23g)'/%3E%3C/svg%3E">
<style>
  /* ---------- Farben & Grundlagen ---------- */
  :root {
    --bg: #0a0a12;
    --bg-2: #11111c;
    --surface: rgba(255, 255, 255, 0.045);
    --surface-2: rgba(255, 255, 255, 0.075);
    --panel: rgba(19, 19, 31, 0.8);
    --surface-hover: rgba(255, 255, 255, 0.1);
    --border: rgba(255, 255, 255, 0.09);
    --border-strong: rgba(255, 255, 255, 0.18);
    --text: #eeeef6;
    --muted: #9b9bb4;
    --faint: #6b6b84;
    --violet: #8b5cf6;
    --pink: #ec4899;
    --amber: #f59e0b;
    --cyan: #22d3ee;
    --blue: #60a5fa;
    --green: #34d399;
    --red: #fb7185;
    --grad: linear-gradient(120deg, var(--violet), var(--pink) 55%, var(--amber));
    --shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 20px 50px -20px rgba(0, 0, 0, 0.6);
    --radius: 18px;
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;
    --tex-cmd: #c4b5fd;
    --tex-chord: #f9a8d4;
    --tex-comment: #6b6b84;
    --tex-brace: #fcd34d;
    color-scheme: dark;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f6f5fb;
      --bg-2: #ffffff;
      --surface: rgba(255, 255, 255, 0.72);
      --surface-2: rgba(255, 255, 255, 0.9);
      --panel: rgba(255, 255, 255, 0.84);
      --surface-hover: #ffffff;
      --border: rgba(20, 16, 50, 0.09);
      --border-strong: rgba(20, 16, 50, 0.18);
      --text: #15131f;
      --muted: #5d5a73;
      --faint: #8e8ba3;
      --shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 20px 50px -24px rgba(60, 40, 120, 0.25);
      --tex-cmd: #6d28d9;
      --tex-chord: #be185d;
      --tex-comment: #9a97ad;
      --tex-brace: #b45309;
      color-scheme: light;
    }
  }

  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    min-height: 100dvh;
    background: var(--bg);
    color: var(--text);
    font: 15.5px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  ::selection { background: color-mix(in oklab, var(--pink) 40%, transparent); }
  [hidden] { display: none !important; }
  :focus-visible { outline: 2px solid var(--pink); outline-offset: 2px; }

  /* ---------- Bühnenlicht im Hintergrund ---------- */
  /* Performance: kein filter/blur und kein mix-blend-mode – die Weichheit steckt in den Verläufen,
     bewegt wird nur per transform (Compositor, kein Neuzeichnen pro Frame). */
  .aurora { position: fixed; inset: -20vmax; z-index: -2; pointer-events: none; opacity: .6; contain: strict; }
  /* .blob folgt dem Mauszeiger (per JS: --mx/--my/--ms), der span darin wandert per CSS. */
  .aurora .blob { position: absolute; width: 55vmax; height: 55vmax; transform: translate3d(var(--mx, 0px), var(--my, 0px), 0) scale(var(--ms, 1)); will-change: transform; }
  .aurora .blob span { position: absolute; inset: 0; border-radius: 50%; will-change: transform; animation: drift 26s var(--ease) infinite alternate; }
  .aurora .blob:nth-child(1) { left: 0; top: 0; }
  .aurora .blob:nth-child(1) span { background: radial-gradient(circle closest-side, color-mix(in oklab, var(--violet) 90%, transparent), color-mix(in oklab, var(--violet) 35%, transparent) 45%, transparent); }
  .aurora .blob:nth-child(2) { right: 0; top: 10%; }
  .aurora .blob:nth-child(2) span { background: radial-gradient(circle closest-side, color-mix(in oklab, var(--pink) 85%, transparent), color-mix(in oklab, var(--pink) 30%, transparent) 45%, transparent); animation-delay: -9s; animation-duration: 32s; }
  .aurora .blob:nth-child(3) { left: 25%; bottom: 0; opacity: .7; }
  .aurora .blob:nth-child(3) span { background: radial-gradient(circle closest-side, color-mix(in oklab, var(--amber) 80%, transparent), color-mix(in oklab, var(--amber) 28%, transparent) 45%, transparent); animation-delay: -17s; }
  @media (prefers-color-scheme: light) { .aurora { opacity: .3; } }
  @keyframes drift {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(8vmax, 6vmax, 0) scale(1.15); }
    100% { transform: translate3d(-6vmax, 10vmax, 0) scale(.95); }
  }
  .grain { position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .06;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }

  .wrap { width: min(1240px, 100% - 2rem); margin-inline: auto; }

  /* ---------- Kopf ---------- */
  .hero { padding: clamp(2.5rem, 8vh, 6rem) 0 2rem; text-align: center; transition: padding .6s var(--ease); }
  body.has-song .hero { padding-top: 1.5rem; padding-bottom: 1.25rem; }
  .brand { display: inline-flex; align-items: center; gap: .55rem; padding: .35rem .8rem .35rem .4rem; border: 1px solid var(--border); border-radius: 999px; background: var(--panel); font-weight: 600; font-size: .85rem; color: var(--muted); }
  .brand svg { width: 22px; height: 22px; }
  .brand b { color: var(--text); letter-spacing: -.01em; }
  h1 { font-size: clamp(2.2rem, 6vw, 4.2rem); line-height: 1.02; letter-spacing: -.045em; font-weight: 750; margin: 1.1rem 0 .8rem; transition: font-size .6s var(--ease), margin .6s var(--ease); }
  body.has-song h1 { font-size: clamp(1.6rem, 3vw, 2.1rem); margin: .8rem 0 .4rem; }
  .grad { background: var(--grad); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: shimmer 2.6s ease-in-out .4s 2 alternate; }
  @keyframes shimmer { to { background-position: 100% 0; } }
  .lead { color: var(--muted); max-width: 36rem; margin: 0 auto 2rem; font-size: 1.05rem; transition: opacity .4s, margin .6s var(--ease); }
  body.has-song .lead { opacity: 0; height: 0; margin: 0; overflow: hidden; }

  /* ---------- Suchfeld ---------- */
  .search { position: relative; max-width: 46rem; margin: 0 auto; display: flex; align-items: center; gap: .5rem; padding: .45rem; border-radius: 20px; background: var(--panel); border: 1px solid var(--border); box-shadow: var(--shadow); transition: border-color .3s, box-shadow .3s; }
  .search::before { content: ""; position: absolute; inset: -1px; border-radius: inherit; padding: 1px; background: var(--grad); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0; transition: opacity .3s; pointer-events: none; }
  .search:focus-within::before { opacity: 1; }
  .search:focus-within { box-shadow: var(--shadow), 0 0 0 6px color-mix(in oklab, var(--pink) 14%, transparent), 0 0 60px -10px color-mix(in oklab, var(--violet) 60%, transparent); }
  .search > svg { flex: none; width: 20px; height: 20px; margin-left: .7rem; color: var(--faint); }
  .search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 1rem; padding: .7rem .25rem; outline: none; }
  .search input::placeholder { color: var(--faint); }

  /* ---------- Buttons ---------- */
  .btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font: inherit; font-weight: 600; font-size: .92rem; padding: .62rem 1.05rem; border-radius: 12px; cursor: pointer; transition: transform .2s var(--ease), background .2s, border-color .2s, box-shadow .3s; white-space: nowrap; }
  .btn:hover { background: var(--surface-hover); border-color: var(--border-strong); transform: translateY(-1px); }
  .btn:active { transform: translateY(0) scale(.98); }
  .btn svg { width: 17px; height: 17px; }
  .btn.primary { border: 0; color: #fff; background: var(--grad); background-size: 160% 100%; box-shadow: 0 8px 24px -8px color-mix(in oklab, var(--pink) 70%, transparent); }
  .btn.primary:hover { background-position: 100% 0; box-shadow: 0 12px 30px -8px color-mix(in oklab, var(--pink) 85%, transparent); }
  .btn.big { padding: .78rem 1.35rem; border-radius: 14px; font-size: .98rem; }
  .btn:disabled { cursor: progress; opacity: .85; transform: none; }
  .btn .spinner { display: none; width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, .35); border-top-color: #fff; animation: spin .7s linear infinite; }
  .btn.loading .spinner { display: inline-block; }
  .btn.loading .label-idle { display: none; }
  .btn .label-busy { display: none; }
  .btn.loading .label-busy { display: inline; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ---------- Status ---------- */
  #status { min-height: 1.6rem; margin: 1rem auto 0; max-width: 46rem; color: var(--muted); font-size: .95rem; }
  #status.error { color: var(--red); animation: shake .45s var(--ease); }
  @keyframes shake { 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }

  /* ---------- Arbeitsbereich ---------- */
  .workspace { padding-bottom: 5rem; }
  .song { display: flex; align-items: center; gap: 1.1rem; flex-wrap: wrap; padding: 1.1rem 1.25rem; margin-bottom: 1.25rem; }
  .song .disc { flex: none; width: 54px; height: 54px; border-radius: 16px; background: var(--grad); display: grid; place-items: center; color: #fff; box-shadow: 0 10px 30px -10px color-mix(in oklab, var(--pink) 80%, transparent); }
  .song .disc svg { width: 26px; height: 26px; }
  .song .meta { flex: 1; min-width: 12rem; }
  .song .title { font-size: 1.35rem; font-weight: 700; letter-spacing: -.02em; line-height: 1.2; }
  .song .artist { color: var(--muted); }
  .chips { display: flex; gap: .4rem; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: .35rem; padding: .28rem .65rem; border-radius: 999px; font-size: .8rem; font-weight: 600; border: 1px solid var(--border); background: var(--surface); color: var(--muted); }
  .chip b { color: var(--text); font-variant-numeric: tabular-nums; }

  .cols { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
  @media (max-width: 980px) { .cols { grid-template-columns: 1fr; } }
  .stack { display: grid; gap: 1.25rem; min-width: 0; }

  .panel { position: relative; background: linear-gradient(180deg, rgba(255, 255, 255, .025), transparent 40%), var(--panel); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }
  .panel-body { padding: 1.25rem; }
  .panel h2 { display: flex; align-items: center; gap: .65rem; margin: 0 0 1rem; font-size: 1.02rem; letter-spacing: -.01em; }
  .panel h2 .num { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; font-size: .8rem; font-weight: 700; color: #fff; background: var(--grad); }
  .panel h2 .hint { margin-left: auto; font-weight: 500; font-size: .8rem; color: var(--faint); }

  /* Einblenden in Stufen */
  .reveal { opacity: 0; transform: translateY(14px) scale(.99); }
  .show .reveal { animation: rise .7s var(--ease) forwards; animation-delay: calc(var(--i, 0) * 80ms); }
  @keyframes rise { to { opacity: 1; transform: none; } }

  /* ---------- Abschnitte ---------- */
  .sections { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
  .sec { --c: var(--faint); position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: .35rem 1rem; padding: .7rem .8rem .7rem 1.05rem; border-radius: 13px; background: var(--surface); border: 1px solid var(--border); overflow: hidden; transition: background .25s, border-color .25s, opacity .25s; animation: rise .5s var(--ease) both; animation-delay: calc(var(--i, 0) * 35ms); opacity: 0; transform: translateY(8px); }
  .sec::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--c); box-shadow: 0 0 18px var(--c); transition: background .35s, box-shadow .35s; }
  .sec:hover { background: var(--surface-2); border-color: var(--border-strong); }
  .sec[data-type="verse"] { --c: var(--blue); }
  .sec[data-type="verse*"] { --c: var(--cyan); }
  .sec[data-type="instrumental"] { --c: var(--amber); }
  .sec[data-type="bridge"] { --c: var(--violet); }
  .sec[data-type="chorus"] { --c: var(--pink); }
  .sec[data-type="omit"] { --c: var(--faint); opacity: .5; }
  .sec[data-type="omit"] .sec-preview { text-decoration: line-through; }
  .sec-name { font-weight: 650; display: flex; align-items: center; gap: .5rem; min-width: 0; }
  .sec-name span { flex: 0 1 auto; min-width: 4ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sec-preview { grid-column: 1 / -1; color: var(--muted); font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .select { position: relative; }
  .select select { appearance: none; -webkit-appearance: none; font: inherit; font-size: .85rem; font-weight: 600; color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: .38rem 2rem .38rem .85rem; cursor: pointer; transition: border-color .2s, background .2s; }
  .select select:hover { border-color: var(--border-strong); }
  .select::after { content: ""; position: absolute; right: .8rem; top: 50%; width: 7px; height: 7px; border: solid var(--muted); border-width: 0 2px 2px 0; transform: translateY(-70%) rotate(45deg); pointer-events: none; }
  .select select option { background: var(--bg-2); color: var(--text); }
  .badge-guess { font-size: .68rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--c); border: 1px solid color-mix(in oklab, var(--c) 45%, transparent); border-radius: 999px; padding: .05rem .45rem; flex: none; }

  /* ---------- Schalter ---------- */
  .switch { display: flex; align-items: center; gap: .85rem; padding: .85rem 1rem; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; margin-bottom: .9rem; transition: border-color .2s, background .2s; }
  .switch:hover { border-color: var(--border-strong); }
  .switch input { position: absolute; opacity: 0; pointer-events: none; }
  .switch .track { flex: none; position: relative; width: 44px; height: 26px; border-radius: 999px; background: var(--surface-hover); border: 1px solid var(--border-strong); transition: background .3s var(--ease); }
  .switch .track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .3); transition: transform .35s var(--ease); }
  .switch input:checked + .track { background: var(--grad); border-color: transparent; }
  .switch input:checked + .track::after { transform: translateX(18px); }
  .switch input:focus-visible + .track { outline: 2px solid var(--pink); outline-offset: 2px; }
  .switch .txt b { display: block; font-size: .95rem; }
  .switch .txt small { color: var(--muted); font-size: .82rem; }

  /* ---------- Akkorde ---------- */
  .chords { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .6rem; }
  .chord { position: relative; display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; gap: .55rem .5rem; padding: .75rem .8rem .8rem; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); transition: transform .25s var(--ease), border-color .25s, background .25s, box-shadow .3s; animation: rise .5s var(--ease) both; animation-delay: calc(var(--i, 0) * 25ms); opacity: 0; transform: translateY(8px); }
  .chord:hover { transform: translateY(-2px); border-color: var(--border-strong); background: var(--surface-2); }
  .chord.changed { border-color: color-mix(in oklab, var(--violet) 60%, transparent); box-shadow: 0 0 0 1px color-mix(in oklab, var(--violet) 35%, transparent), 0 10px 30px -14px var(--violet); }
  .chord.removed { opacity: .55; }
  .chord.removed .chord-name { text-decoration: line-through; }
  .chord.missing { border-color: color-mix(in oklab, var(--amber) 55%, transparent); }
  .chord-name { font-family: var(--mono); font-size: 1.25rem; font-weight: 700; letter-spacing: -.02em; line-height: 1.1; align-self: center; }
  .chord-count { align-self: center; font-size: .75rem; font-weight: 700; color: var(--muted); background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: .1rem .5rem; font-variant-numeric: tabular-nums; }
  .chord-warn { position: absolute; top: -8px; right: -6px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: .75rem; font-weight: 800; color: #1a1300; background: var(--amber); box-shadow: 0 4px 14px -4px var(--amber); }
  .chord-edit { grid-column: 1 / -1; display: flex; gap: .4rem; }
  .chord-edit input[type="text"] { flex: 1; min-width: 0; font: inherit; font-family: var(--mono); font-size: .88rem; color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: .35rem .55rem; outline: none; transition: border-color .2s, box-shadow .2s; }
  .chord-edit input[type="text"]:focus { border-color: var(--violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--violet) 25%, transparent); }
  .chord-edit input[type="text"]:disabled { opacity: .45; }
  .toggle { position: relative; display: inline-flex; }
  .toggle input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
  .toggle span { display: grid; place-items: center; width: 34px; height: 100%; min-height: 31px; border-radius: 9px; border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); transition: all .2s; }
  .toggle span svg { width: 15px; height: 15px; }
  .toggle input:checked + span { background: color-mix(in oklab, var(--red) 20%, transparent); border-color: color-mix(in oklab, var(--red) 55%, transparent); color: var(--red); }
  .toggle input:focus-visible + span { outline: 2px solid var(--pink); outline-offset: 2px; }

  /* ---------- Liederbücher ---------- */
  .books { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: .6rem; }
  .field { display: grid; gap: .3rem; min-width: 0; font-size: .8rem; font-weight: 600; color: var(--muted); }
  .field input { width: 100%; min-width: 0; font: inherit; font-size: .95rem; font-weight: 500; color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 11px; padding: .55rem .7rem; outline: none; transition: border-color .2s, box-shadow .2s; }
  .field input:focus { border-color: var(--violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--violet) 25%, transparent); }

  /* ---------- Vorschau ---------- */
  .preview { position: sticky; top: 1rem; display: flex; flex-direction: column; max-height: calc(100dvh - 2rem); overflow: hidden; }
  @media (max-width: 980px) { .preview { position: relative; top: 0; max-height: none; } }
  .preview-head { display: flex; align-items: center; gap: .6rem; padding: .8rem .9rem .8rem 1rem; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .dots { display: flex; gap: 6px; margin-right: .3rem; }
  .dots i { width: 11px; height: 11px; border-radius: 50%; background: var(--border-strong); }
  .dots i:nth-child(1) { background: #ff5f57; } .dots i:nth-child(2) { background: #febc2e; } .dots i:nth-child(3) { background: #28c840; }
  .filename { font-family: var(--mono); font-size: .85rem; color: var(--muted); flex: 1; min-width: 8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .actions { display: flex; gap: .45rem; }
  .warnings { list-style: none; margin: 0; padding: 0 1rem; display: grid; gap: .5rem; }
  .warnings:not(:empty) { padding: .9rem 1rem 0; }
  .warnings li { display: flex; gap: .6rem; align-items: flex-start; padding: .65rem .8rem; border-radius: 12px; font-size: .86rem; color: var(--text); background: color-mix(in oklab, var(--amber) 12%, transparent); border: 1px solid color-mix(in oklab, var(--amber) 35%, transparent); animation: rise .4s var(--ease) both; opacity: 0; transform: translateY(6px); }
  .warnings li::before { content: "!"; flex: none; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-weight: 800; font-size: .75rem; color: #1a1300; background: var(--amber); }
  .code { position: relative; flex: 1; overflow: auto; margin: 0; padding: 1rem 1.1rem 1.4rem; font: .82rem/1.65 var(--mono); tab-size: 2; white-space: pre; counter-reset: ln; }
  .code .ln { display: block; padding-left: 3.1em; position: relative; }
  .code .ln::before { counter-increment: ln; content: counter(ln); position: absolute; left: 0; width: 2.2em; text-align: right; color: var(--faint); opacity: .55; user-select: none; }
  .code .ln:hover { background: var(--surface); }
  .code.flash { animation: flash .6s var(--ease); }
  @keyframes flash { from { box-shadow: inset 0 0 0 9999px color-mix(in oklab, var(--violet) 9%, transparent); } }
  .t-cmd { color: var(--tex-cmd); }
  .t-chord { color: var(--tex-chord); font-weight: 700; }
  .t-comment { color: var(--tex-comment); font-style: italic; }
  .t-brace { color: var(--tex-brace); }

  /* ---------- Toast ---------- */
  .toast { position: fixed; left: 50%; bottom: 1.5rem; translate: -50% 0; display: flex; align-items: center; gap: .55rem; padding: .7rem 1.05rem; border-radius: 14px; font-weight: 600; font-size: .92rem; color: var(--text); background: var(--surface-2); border: 1px solid var(--border-strong); box-shadow: 0 20px 50px -15px rgba(0, 0, 0, .5); opacity: 0; transform: translateY(16px) scale(.96); transition: opacity .35s var(--ease), transform .45s var(--ease); pointer-events: none; z-index: 10; }
  .toast.on { opacity: 1; transform: none; }
  .toast::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--green); box-shadow: 0 0 12px var(--green); }

  footer { margin-top: auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; text-align: center; color: var(--faint); font-size: .8rem; padding: 2rem 0; }

  @media (max-width: 560px) {
    .sec { grid-template-columns: 1fr; }
    .sec .select select { width: 100%; }
    .panel h2 .hint { display: none; }
    .search { flex-wrap: wrap; }
    .search > svg { display: none; }
    .search input { flex-basis: 100%; padding: .6rem .7rem; }
    .search .btn { width: 100%; }
    .preview-head .actions { width: 100%; }
    .preview-head .actions .btn { flex: 1; }
  }

  /* Effekte aus (Schalter im Footer, Standard bei „Bewegung reduzieren“): Animationen springen
     sofort in ihren Endzustand, Lichter stehen still – die Seite wird einmal gezeichnet und
     ändert sich nur noch bei Eingaben. */
  html.calm *, html.calm *::before, html.calm *::after { animation: none !important; transition: none !important; }
  /* Was sonst erst per Animation einblendet, ist sofort sichtbar (:where hält die Spezifität
     niedrig, damit z. B. „weggelassene“ Abschnitte ihre eigene Deckkraft behalten). */
  html.calm :where(.reveal, .sec, .chord, .warnings li) { opacity: 1; transform: none; }
  html.calm .aurora .blob, html.calm .aurora .blob span { transform: none !important; will-change: auto; }
  html.calm .btn .spinner { display: none !important; }

  .fx { display: inline-flex; align-items: center; gap: .55rem; margin-left: 1rem; padding: .3rem .7rem .3rem .4rem; border: 1px solid var(--border); border-radius: 999px; background: var(--panel); color: var(--muted); font-weight: 600; cursor: pointer; user-select: none; }
  .fx:hover { border-color: var(--border-strong); color: var(--text); }
  .fx input { position: absolute; opacity: 0; pointer-events: none; }
  .fx .track { position: relative; width: 30px; height: 18px; border-radius: 999px; background: var(--surface-hover); border: 1px solid var(--border-strong); transition: background .25s; }
  .fx .track::after { content: ""; position: absolute; top: 1px; left: 1px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform .25s var(--ease); }
  .fx input:checked + .track { background: var(--grad); border-color: transparent; }
  .fx input:checked + .track::after { transform: translateX(12px); }
  .fx input:focus-visible + .track { outline: 2px solid var(--pink); outline-offset: 2px; }
  @media (max-width: 560px) { .fx { margin: .75rem 0 0; } }
</style>
<script>
  // Vor dem ersten Zeichnen: gespeicherte Wahl, sonst Systemeinstellung „Bewegung reduzieren“.
  try {
    var fx = localStorage.getItem("u2l-effects");
    var calm = fx ? fx === "off" : matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) document.documentElement.classList.add("calm");
  } catch (e) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("calm");
  }
</script>
</head>
<body>
<div class="aurora" id="aurora" aria-hidden="true"><div class="blob"><span></span></div><div class="blob"><span></span></div><div class="blob"><span></span></div></div>
<div class="grain" aria-hidden="true"></div>

<header class="hero wrap">
  <div class="brand">
    <svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset=".55" stop-color="#ec4899"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><path d="M16 3c7 0 12 3 12 8 0 7-7 15-12 18C11 26 4 18 4 11c0-5 5-8 12-8z" fill="url(#lg)"/><path d="M13 10v9.2a2.6 2.6 0 1 0 1.6 2.4V13l5-1.3v5.7a2.6 2.6 0 1 0 1.6 2.4V8.5z" fill="#fff" opacity=".95"/></svg>
    <b>u2l</b> Ultimate Guitar → LaTeX
  </div>
  <h1>Vom Tab ins <span class="grad">Liederbuch</span>.</h1>
  <p class="lead">Link einfügen, Abschnitte und Akkorde prüfen, fertige <code>.tex</code> fürs songs-Paket herunterladen.</p>
  <form id="fetch" class="search" autocomplete="off">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    <input name="url" type="url" required placeholder="https://tabs.ultimate-guitar.com/tab/…" aria-label="Link zu Ultimate Guitar" spellcheck="false">
    <button class="btn primary big" id="fetch-btn">
      <span class="spinner" aria-hidden="true"></span>
      <span class="label-idle">Abrufen</span><span class="label-busy">Lade …</span>
    </button>
  </form>
  <p id="status" role="status" aria-live="polite"></p>
</header>

<main id="editor" class="workspace wrap" hidden>
  <section class="panel song reveal" style="--i:0">
    <div class="disc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
    <div class="meta"><div class="title" id="song-title"></div><div class="artist" id="song-artist"></div></div>
    <div class="chips" id="song-chips"></div>
  </section>

  <div class="cols">
    <div class="stack">
      <section class="panel reveal" style="--i:1">
        <div class="panel-body">
          <h2><span class="num">1</span> Abschnitte <span class="hint">Typ pro Abschnitt wählen</span></h2>
          <ol class="sections" id="sections"></ol>
        </div>
      </section>

      <section class="panel reveal" style="--i:2">
        <div class="panel-body">
          <h2><span class="num">2</span> Akkorde <span class="hint">Ersatz gilt im ganzen Lied</span></h2>
          <label class="switch">
            <input type="checkbox" id="simplify">
            <span class="track" aria-hidden="true"></span>
            <span class="txt"><b>Lagerfeuer-Akkorde</b><small>ohne Bass-Töne, maj7, sus und Powerchords</small></span>
          </label>
          <div class="chords" id="chords"></div>
        </div>
      </section>

      <section class="panel reveal" style="--i:3">
        <div class="panel-body">
          <h2><span class="num">3</span> Andere Liederbücher <span class="hint">optional</span></h2>
          <div class="books" id="books"></div>
        </div>
      </section>
    </div>

    <aside class="panel preview reveal" style="--i:2" aria-label="Ergebnis">
      <div class="preview-head">
        <div class="dots" aria-hidden="true"><i></i><i></i><i></i></div>
        <span class="filename" id="filename"></span>
        <div class="actions">
          <button class="btn" id="copy" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Kopieren
          </button>
          <button class="btn primary" id="download" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
            Herunterladen
          </button>
        </div>
      </div>
      <ul class="warnings" id="warnings"></ul>
      <pre class="code" id="tex" tabindex="0" aria-label="LaTeX-Vorschau"></pre>
    </aside>
  </div>
</main>

<footer class="wrap">
  <span>u2l · für das songs-Paket · Akkorde in deutscher Schreibweise</span>
  <label class="fx" title="Aus: keine Animationen, Seite bleibt ruhig und spart Akku">
    <input type="checkbox" id="fx" checked>
    <span class="track" aria-hidden="true"></span>
    Effekte
  </label>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script type="module">
  const TYPES = [
    ["verse", "Strophe"], ["verse*", "Strophe ungezählt"], ["instrumental", "Instrumental"],
    ["bridge", "Bridge"], ["chorus", "Refrain"], ["omit", "Weglassen"],
  ];
  const TYPE_LABEL = Object.fromEntries(TYPES);
  const BOOKS = ${JSON.stringify(SONGBOOKS.map(({ key, label }) => ({ key, label })))};
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };
  const icon = (svg) => { const t = document.createElement("template"); t.innerHTML = svg; return t.content.firstChild; };

  let tab = null;
  let result = null;
  const state = { simplify: false, sectionTypes: {}, replace: {}, songbooks: {} };

  /* ---------- Liederbücher ---------- */
  $("books").replaceChildren(...BOOKS.map(({ key, label }) => {
    const input = el("input", { type: "text", inputMode: "numeric", maxLength: 10, placeholder: "–" });
    input.addEventListener("input", debounce(() => {
      const value = input.value.trim();
      if (value) state.songbooks[key] = value; else delete state.songbooks[key];
      if (tab) refresh();
    }, 300));
    return el("label", { className: "field" }, label, input);
  }));

  /* ---------- Abruf ---------- */
  function setStatus(text, cls = "") {
    const s = $("status");
    s.className = "";
    void s.offsetWidth; // Animation neu starten
    s.textContent = text;
    s.className = cls;
  }

  async function post(url, body) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ error: "Ungültige Antwort vom Server." }));
    if (!res.ok) throw new Error(data.error ?? "Fehler " + res.status);
    return data;
  }

  $("fetch").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("fetch-btn");
    btn.classList.add("loading");
    btn.disabled = true;
    setStatus("");
    try {
      tab = await post("/api/ug", { url: e.target.url.value });
      Object.assign(state, { simplify: false, sectionTypes: {}, replace: {}, songbooks: {} });
      $("simplify").checked = false;
      for (const input of $("books").querySelectorAll("input")) input.value = "";
      await convert({ rebuild: true });
      renderSong();
      const editor = $("editor");
      editor.classList.remove("show");
      editor.hidden = false;
      document.body.classList.add("has-song");
      requestAnimationFrame(() => editor.classList.add("show"));
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  });

  /* ---------- Umwandeln ---------- */
  let pending = 0;
  async function convert({ rebuild = false, rebuildChords = false } = {}) {
    const ticket = ++pending;
    const data = await post("/api/convert", { tab, options: state });
    if (ticket !== pending) return; // veraltete Antwort
    const changed = result && result.tex !== data.tex;
    result = data;
    if (rebuild) renderSections();
    if (rebuild || rebuildChords) renderChords();
    renderTex(data.tex, changed);
    $("filename").textContent = data.filename;
    $("warnings").replaceChildren(...data.warnings.map((w) => el("li", { textContent: w })));
    renderChips();
  }
  const refresh = (opts) => convert(opts).catch((err) => setStatus(err.message, "error"));

  function renderSong() {
    $("song-title").textContent = tab.title;
    $("song-artist").textContent = tab.artist || "Unbekannter Interpret";
  }

  function renderChips() {
    const chip = (label, value) => el("span", { className: "chip" }, el("b", { textContent: String(value) }), label);
    const active = result.sections.filter((s) => s.type !== "omit").length;
    const chips = [chip("Abschnitte", active), chip("Akkorde", result.chords.length)];
    if (tab.capo) chips.unshift(chip("Capo", tab.capo));
    if (tab.tonality) chips.push(chip("Tonart", tab.tonality));
    $("song-chips").replaceChildren(...chips);
  }

  /* ---------- Abschnitte ---------- */
  function renderSections() {
    $("sections").replaceChildren(...result.sections.map((s, i) => {
      const name = s.name || "Ohne Überschrift";
      const select = el("select", { ariaLabel: "Typ für " + name },
        ...TYPES.map(([value, label]) => el("option", { value, textContent: label, selected: value === s.type })));
      const guess = el("span", { className: "badge-guess", textContent: "Vorschlag", title: "Vom Tool vorgeschlagen" });
      const li = el("li", { className: "sec" },
        el("div", { className: "sec-name" }, el("span", { textContent: name }), guess),
        el("div", { className: "select" }, select),
        el("div", { className: "sec-preview", textContent: s.preview || "–" }));
      li.dataset.type = s.type;
      li.style.setProperty("--i", i);
      select.addEventListener("change", () => {
        state.sectionTypes[s.index] = select.value;
        li.dataset.type = select.value;
        guess.hidden = select.value !== s.guess;
        refresh();
      });
      return li;
    }));
  }

  /* ---------- Akkorde ---------- */
  function renderChords() {
    $("chords").replaceChildren(...result.chords.map((c, i) => {
      const current = state.replace[c.name];
      const input = el("input", { type: "text", placeholder: "Ersatz", value: current ?? "", disabled: current === "", ariaLabel: "Ersatz für " + c.name, spellcheck: false });
      const remove = el("input", { type: "checkbox", checked: current === "", ariaLabel: c.name + " entfernen" });
      const card = el("div", { className: "chord" + (c.inCatalog ? "" : " missing") },
        el("span", { className: "chord-name", textContent: c.name }),
        el("span", { className: "chord-count", textContent: "×" + c.count, title: c.count + "× im Lied" }),
        el("div", { className: "chord-edit" }, input, el("label", { className: "toggle", title: "Akkord entfernen" }, remove, el("span", {}, icon(ICON_X)))));
      if (!c.inCatalog) card.append(el("span", { className: "chord-warn", textContent: "!", title: "Kein Griffbild im Katalog" }));
      card.style.setProperty("--i", i);
      const mark = () => {
        card.classList.toggle("removed", remove.checked);
        card.classList.toggle("changed", !remove.checked && input.value.trim() !== "");
      };
      const update = () => {
        if (remove.checked) state.replace[c.name] = "";
        else if (input.value.trim()) state.replace[c.name] = input.value.trim();
        else delete state.replace[c.name];
        input.disabled = remove.checked;
        refresh();
      };
      input.addEventListener("input", () => { mark(); updateLater(); });
      const updateLater = debounce(update, 300);
      remove.addEventListener("change", () => { mark(); update(); });
      mark();
      return card;
    }));
  }

  $("simplify").addEventListener("change", (e) => {
    state.simplify = e.target.checked;
    state.replace = {}; // Akkordnamen ändern sich – Ersetzungen passen nicht mehr
    refresh({ rebuildChords: true });
  });

  /* ---------- LaTeX-Vorschau mit Hervorhebung ---------- */
  const TOKEN = /((?<!\\)%.*$)|(\\\[[^\]]*\])|(\\[A-Za-z]+\*?|\\\\)|([{}[\]])/g;
  const CLASSES = ["t-comment", "t-chord", "t-cmd", "t-brace"];
  function renderTex(tex, flash) {
    const pre = $("tex");
    const frag = document.createDocumentFragment();
    for (const line of tex.replace(/\n$/, "").split("\n")) {
      const row = el("span", { className: "ln" });
      let last = 0;
      for (const m of line.matchAll(TOKEN)) {
        if (m.index > last) row.append(line.slice(last, m.index));
        const kind = m.slice(1).findIndex(Boolean);
        row.append(el("span", { className: CLASSES[kind], textContent: m[0] }));
        last = m.index + m[0].length;
      }
      row.append(line.slice(last) + "\n");
      frag.append(row);
    }
    pre.replaceChildren(frag);
    if (flash) { pre.classList.remove("flash"); void pre.offsetWidth; pre.classList.add("flash"); }
  }

  /* ---------- Aktionen ---------- */
  $("download").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([result.tex], { type: "application/x-tex;charset=utf-8" }));
    el("a", { href: url, download: result.filename }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(result.filename + " heruntergeladen");
  });

  $("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(result.tex);
      toast("In die Zwischenablage kopiert");
    } catch {
      toast("Kopieren nicht erlaubt – bitte markieren und kopieren");
    }
  });

  let toastTimer;
  function toast(text) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("on"), 2200);
  }

  /* ---------- Lichter folgen dem Mauszeiger ---------- */
  // Jede Lichtquelle wird vom Zeiger angezogen – je näher er ist, desto stärker (weich gefedert).
  // Nur mit Maus/Stift und eingeschalteten Effekten; die Schleife schläft, wenn alles ruht.
  const root = document.documentElement;
  const calm = () => root.classList.contains("calm");
  const lights = (() => {
    const blobs = [...document.querySelectorAll("#aurora .blob")].map((node) => ({ node, x: 0, y: 0, s: 1, tx: 0, ty: 0, ts: 1 }));
    const pointer = { x: 0, y: 0, active: false };
    let frame = 0;

    const aim = () => {
      const reach = Math.max(innerWidth, innerHeight) * 0.9;
      for (const b of blobs) {
        if (!pointer.active) { b.tx = 0; b.ty = 0; b.ts = 1; continue; }
        const r = b.node.getBoundingClientRect();
        const cx = r.left + r.width / 2 - b.x;
        const cy = r.top + r.height / 2 - b.y;
        const dx = pointer.x - cx, dy = pointer.y - cy;
        const pull = Math.max(0, 1 - Math.hypot(dx, dy) / reach);
        const ease = pull * pull * (3 - 2 * pull); // smoothstep
        b.tx = dx * 0.55 * ease;
        b.ty = dy * 0.55 * ease;
        b.ts = 1 + 0.18 * ease;
      }
    };

    const tick = () => {
      let moving = false;
      for (const b of blobs) {
        b.x += (b.tx - b.x) * 0.045;
        b.y += (b.ty - b.y) * 0.045;
        b.s += (b.ts - b.s) * 0.045;
        if (Math.abs(b.tx - b.x) > 0.3 || Math.abs(b.ty - b.y) > 0.3 || Math.abs(b.ts - b.s) > 0.001) moving = true;
        b.node.style.setProperty("--mx", b.x.toFixed(1) + "px");
        b.node.style.setProperty("--my", b.y.toFixed(1) + "px");
        b.node.style.setProperty("--ms", b.s.toFixed(4));
      }
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { aim(); if (!frame) frame = requestAnimationFrame(tick); };

    addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" || calm()) return;
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      wake();
    }, { passive: true });
    root.addEventListener("pointerleave", () => { pointer.active = false; if (!calm()) wake(); });
    addEventListener("blur", () => { pointer.active = false; if (!calm()) wake(); });

    // Sofort zurück auf Ausgangslage, ohne Animation.
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer.active = false;
      for (const b of blobs) {
        Object.assign(b, { x: 0, y: 0, s: 1, tx: 0, ty: 0, ts: 1 });
        b.node.style.removeProperty("--mx");
        b.node.style.removeProperty("--my");
        b.node.style.removeProperty("--ms");
      }
    };
    return { reset };
  })();

  /* ---------- Schalter „Effekte“ ---------- */
  const fxToggle = $("fx");
  fxToggle.checked = !calm();
  fxToggle.addEventListener("change", () => {
    root.classList.toggle("calm", !fxToggle.checked);
    if (!fxToggle.checked) lights.reset();
    try { localStorage.setItem("u2l-effects", fxToggle.checked ? "on" : "off"); } catch {}
  });

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
</script>
</body>
</html>`;
