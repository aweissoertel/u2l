# u2l

**Ultimate Guitar → LaTeX** für unser Liederbuch (LaTeX-Paket [`songs`](https://songs.sourceforge.net/songsdoc/songs.html)).

Link zu einem Lied auf Ultimate Guitar einfügen, Abschnitte und Akkorde bei Bedarf anpassen,
fertige `.tex`-Datei herunterladen.

> Status: Grundgerüst. Der Abruf von Ultimate Guitar funktioniert, die LaTeX-Ausgabe folgt.
> Das Zielformat steht in [docs/format.md](docs/format.md).

## Entwicklung

```bash
nvm use       # Node 26 laut .nvmrc (mindestens 24)
npm install
npm test
npm run dev   # http://localhost:3000
```

## Danksagung

Idee und erster LaTeX-Formatter: [ftes/ultimate-to-chordpro](https://github.com/ftes/ultimate-to-chordpro) (MIT).
