# u2l – Ultimate Guitar → LaTeX

Web-Tool: Ultimate-Guitar-Link einfügen → `.tex`-Datei für unser Liederbuch (LaTeX `songs`-Paket).
Ausgeliefert als Docker-Image. **Keine CLI** – nur Weboberfläche.

## Wichtigste Quelle

[`docs/format.md`](docs/format.md) ist die verbindliche Formatspezifikation. Jede Änderung am
Ausgabeformat zuerst dort eintragen, dann umsetzen. Griffbilder: [`chords/catalog.tex`](chords/catalog.tex).

## Befehle

```bash
npm install          # Node >= 22 (lokal empfohlen: 22.12+ oder 24)
npm test             # vitest
npm run typecheck
npm run format       # prettier
npm run dev          # Server mit Reload auf http://localhost:3000
npm run build && npm start
```

## Aufbau

- `src/ug/` – UG-Abruf: URL prüfen (`url.ts`, nur `tabs.ultimate-guitar.com`), Seite holen
  (`fetch.ts`, Weiterleitungen werden einzeln geprüft), JSON aus `js-store` lesen (`extract.ts`),
  Text bereinigen (`normalize.ts`, u. a. kyrillische Doppelgänger).
- `src/app.ts` – Hono-App (testbar ohne Server), `src/server.ts` – Start.
- `test/` – vitest. Testdaten im Repo sind **erfunden**. `test/private/` läuft gegen echte
  UG-Seiten in `examples/ug/` und wird übersprungen, wenn die fehlen.

## Regeln

- **Das Repo ist öffentlich.** Echte Liederbuch-Dateien (Präambel, `main.tex`, Lieder) und echte
  UG-Seiten/Liedtexte gehören nur nach `examples/` (per `.gitignore` ausgeschlossen) – nie in
  `test/`, `docs/` oder Commits.
- Commit-Betreff: `<passendes Emoji> <type>: <Zusammenfassung>`, z. B. `✨ feat: …`, `🐛 fix: …`,
  `📝 docs: …`, `✅ test: …`, `🔧 chore: …`. Text auf Deutsch.
- Commits werden GPG-signiert (`commit.gpgsign` ist im Repo gesetzt).
- Nicht direkt auf `main` committen; Feature-Branch + PR.
- Fehlermeldungen an Nutzer: deutsch, verständlich, ohne interne Details (`UgError`).
