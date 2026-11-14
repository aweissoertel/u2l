# u2l – Ultimate Guitar → LaTeX

Web-Tool: Ultimate-Guitar-Link einfügen → `.tex`-Datei für unser Liederbuch (LaTeX `songs`-Paket).
Ausgeliefert als Docker-Image. **Keine CLI** – nur Weboberfläche.

## Wichtigste Quelle

[`docs/format.md`](docs/format.md) ist die verbindliche Formatspezifikation. Jede Änderung am
Ausgabeformat zuerst dort eintragen, dann umsetzen. Griffbilder: [`chords/catalog.tex`](chords/catalog.tex).

## Befehle

```bash
nvm use             # Node 26 (siehe .nvmrc), mindestens 24
npm install
npm test             # vitest
npm run typecheck    # TypeScript 7 (tsc)
npm run format       # prettier
npm run dev          # node --watch src/server.ts → http://localhost:3000
npm run build && npm start
```

Node führt die `.ts`-Dateien direkt aus (Type Stripping, kein tsx/ts-node). Deshalb:

- Relative Imports immer mit `.ts`-Endung (`import { x } from "./foo.ts"`); `tsc` schreibt sie
  beim Build zu `.js` um.
- Nur löschbare TS-Syntax (`erasableSyntaxOnly`): keine `enum`s, keine `namespace`s, keine
  Parameter-Properties im Konstruktor.
- Reine Typ-Imports als `import type` bzw. `type` im Import (`verbatimModuleSyntax`).

## Aufbau

- `src/ug/` – UG-Abruf: URL prüfen (`url.ts`, nur `tabs.ultimate-guitar.com`), Seite holen
  (`fetch.ts`, Weiterleitungen werden einzeln geprüft), JSON aus `js-store` lesen (`extract.ts`),
  Text bereinigen (`normalize.ts`, u. a. kyrillische Doppelgänger).
- `src/app.ts` – Hono-App (testbar ohne Server), `src/server.ts` – Start.
- `test/` – vitest. Testdaten im Repo sind **erfunden**. `test/private/` läuft gegen echte
  UG-Seiten in `examples/ug/` und wird übersprungen, wenn die fehlen.

## Build & Deployment

- `Dockerfile`: mehrstufig, `node:<version>-alpine`, nur `dist/` + Laufzeit-Abhängigkeiten, läuft als
  `node`. `.dockerignore` ist eine Whitelist – neue Dateien, die ins Image müssen, dort freigeben.
- `.github/workflows/ci.yml`: Tests bei jedem PR/Push; Job `image` baut bei PRs/anderen Branches
  ohne Push, Job `publish` pusht bei Push auf `main` nach Docker Hub (`latest`, `sha-…`).
  Docker-Hub-Zugang nur über die Environment `dockerhub` (auf `main` beschränkt) – Secrets nie in
  andere Jobs ziehen. Actions sind per Commit-SHA gepinnt (Dependabot aktualisiert sie).
- Node-Version an drei Stellen gleich halten: `.nvmrc`, `Dockerfile`, `@types/node`.

## Regeln

- **Das Repo ist öffentlich.** Echte Liederbuch-Dateien (Präambel, `main.tex`, Lieder) und echte
  UG-Seiten/Liedtexte gehören nur nach `examples/` (per `.gitignore` ausgeschlossen) – nie in
  `test/`, `docs/` oder Commits.
- Commit-Betreff: `<passendes Emoji> <type>: <Zusammenfassung>`, z. B. `✨ feat: …`, `🐛 fix: …`,
  `📝 docs: …`, `✅ test: …`, `🔧 chore: …`. Text auf Deutsch.
- Commits werden GPG-signiert (`commit.gpgsign` ist im Repo gesetzt).
- Nicht direkt auf `main` committen; Feature-Branch + PR.
- Fehlermeldungen an Nutzer: deutsch, verständlich, ohne interne Details (`UgError`).
