# u2l

**Ultimate Guitar → LaTeX** für unser Liederbuch (LaTeX-Paket [`songs`](https://songs.sourceforge.net/songsdoc/songs.html)).

Link zu einem Lied auf Ultimate Guitar einfügen, Abschnitte und Akkorde bei Bedarf anpassen,
fertige `.tex`-Datei herunterladen.

- Abschnitte werden automatisch als Strophe, Refrain, Bridge oder Instrumental erkannt – und lassen
  sich pro Abschnitt ändern oder weglassen.
- Akkorde in deutscher Schreibweise (H/B), optional als „Lagerfeuer-Akkorde“ vereinfacht, und
  einzeln im ganzen Lied ersetzbar.
- Griffbilder aus [chords/catalog.tex](chords/catalog.tex) – nur für die Akkorde, die im Lied vorkommen.
- Optionale Verweise auf andere Liederbücher (Swapingo alt, CopacaBeLa, IsarBeLa, Liederbock, Doppelbock).

Das Ausgabeformat steht in [docs/format.md](docs/format.md).

## Entwicklung

```bash
nvm use       # Node 26 laut .nvmrc (mindestens 24)
npm install
npm test
npm run dev   # http://localhost:3000
```

## Docker

```bash
docker run -d --name u2l -p 3000:3000 --restart unless-stopped <dockerhub-user>/u2l:latest
```

Das Image lauscht auf Port `3000` (änderbar mit `-e PORT=…`), läuft als Nicht-root-Nutzer und hat
einen Healthcheck auf `/healthz`. Es wird für `linux/amd64` und `linux/arm64` gebaut.

Lokal bauen: `docker build -t u2l .`

### Build-Pipeline

[`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Ereignis      | Tests | Image bauen | Push nach Docker Hub           |
| ------------- | ----- | ----------- | ------------------------------ |
| Pull Request  | ✅    | ✅          | –                              |
| Push auf main | ✅    | ✅          | ✅ `latest` und `sha-<commit>` |

Der Push läuft im Job `publish` mit der Environment `dockerhub`. Nur dieser Job bekommt das
Docker-Hub-Token – Läufe auf anderen Branches und PRs kommen nicht heran.

Einmalig in GitHub unter **Settings → Environments → New environment** `dockerhub` anlegen:

- **Deployment branches and tags:** „Selected branches and tags“ → `main`
- optional **Required reviewers:** dann wartet jeder Push nach Docker Hub auf eine Freigabe
- **Environment variable** `DOCKERHUB_USERNAME` – Docker-Hub-Nutzer bzw. -Organisation
- **Environment secret** `DOCKERHUB_TOKEN` – Docker-Hub-Access-Token mit „Read & Write“

Dependabot hält npm-Pakete, Actions und das Node-Basis-Image aktuell.

## Danksagung

Idee und erster LaTeX-Formatter: [ftes/ultimate-to-chordpro](https://github.com/ftes/ultimate-to-chordpro) (MIT).
