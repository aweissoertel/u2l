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
- `src/song/` – Liedmodell (`types.ts`). `parse-ug.ts` zerlegt den UG-Text in Abschnitte und setzt
  Akkorde spaltengenau in den Text; `chords.ts` macht die Akkord-Verarbeitung (Lagerfeuer,
  deutsch, Ersetzen, Doppelte); `sections.ts` rät den Abschnitts-Typ.
- `src/latex/` – `format.ts` erzeugt die .tex-Datei, `escape.ts` maskiert Text, `catalog.ts` liest
  `chords/catalog.tex`, `filename.ts` baut den Dateinamen.
- `src/convert.ts` – die ganze Pipeline: UG-Song + Optionen → .tex, Abschnitte, Akkordliste, Warnungen.
- `src/app.ts` – Hono-App (`/api/ug`, `/api/convert`, testbar ohne Server), `src/web/page.ts` –
  Weboberfläche (eine Seite, Vanilla JS, keine externen Ressourcen, UG-Inhalte nur per `textContent`; als `String.raw` – im Client-Skript keine Backticks und kein `${…}`), `src/server.ts` – Start.
- `test/` – vitest. Testdaten im Repo sind **erfunden**. `test/convert.test.ts` enthält eine
  vollständig ausgeschriebene Beispielausgabe – die Spezifikation als Test.
- `test/private/` läuft gegen echte UG-Seiten in `examples/ug/`, die Handfassungen in
  `examples/reference/` und geprüfte Ausgaben in `examples/expected/`; wird übersprungen, wenn die
  fehlen. Wackelkontakt muss in Text und Akkorden **exakt** der Handfassung entsprechen.
  Ändert sich die Ausgabe gewollt: `examples/expected/` neu erzeugen und den Diff prüfen.

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
- Commit-Betreff: `<Emoji> <type>: <Zusammenfassung>`, Text auf Deutsch. Das Emoji zeigt den
  **Inhalt** der Änderung, nicht den Commit-Typ – also nicht automatisch ✨ für `feat` oder 🐛 für
  `fix`. Beispiele: `🎸 feat: Griffbilder raten`, `🔤 fix: Umlaute aus UG-Seiten dekodieren`,
  `📖 feat: Verweise auf andere Liederbücher`, `🐳 ci: Image nach Docker Hub pushen`,
  `🎛️ feat: Abschnitts-Editor in der Oberfläche`. PR-Titel genauso.
- Commits werden GPG-signiert (`commit.gpgsign` ist im Repo gesetzt).
- Nicht direkt auf `main` committen; Feature-Branch + PR.
- Fehlermeldungen an Nutzer: deutsch, verständlich, ohne interne Details (`UgError`).
