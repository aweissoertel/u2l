# Ausgabeformat (Swapingo Layout M1)

Abgeleitet aus `examples/reference/*.tex`, `examples/vorlage.tex`, `examples/praeambel.tex`
und einer Auswertung aller 112 Lieder im Liederbuch-Ordner (nur gelesen).
Punkte mit **OFFEN** sind noch nicht entschieden.

## 1. Dateiaufbau

```tex
\songcolumns{1} % auf wie viele Spalten ist das Lied aufgeteilt. Standard: 1

\beginsong{<Titel>} % Name des Liedes
  [by={<Interpret>} % Autor des Liedes
  ]

\capo{<n>} % Capo Nummer                       ← nur wenn UG einen Capo angibt

<Griffbilder-Block, siehe 3>



<Abschnitte, siehe 4>

\endsong
```

- Optionale Song-Keys aus der Präambel (`LSVE`, `LCopacaBeLa`, `LIsarBeLa`, `LLiederbock`,
  `LDoppelbock`) kennt UG nicht. Das Tool lässt sie weg; die Weboberfläche bietet optionale Felder.
- Dateiname: Titel in Kleinbuchstaben, `snake_case`, Umlaute als `ae/oe/ue/ss`
  (z. B. `flinke_haende.tex`).
- Kodierung UTF-8, Zeilenenden LF.

## 2. Akkordnamen

- Ausgabe als `\[Akkord]`, direkt vor der Silbe, über der UG den Akkord platziert –
  auch mitten im Wort (`H\[C]immel`).
- Steht der Akkord am Zeilenanfang vor einer Pause, folgen zwei Leerzeichen: `\[Am]  Der triste …`.
- `N.C.` bleibt `\[N.C.]` (kein Griffbild).
- Deutsche Schreibweise: englisch `B` → `H` (`Bm` → `Hm`, `B7` → `H7`, `C/B` → `C/H`),
  englisch `Bb` → `B` (`Bbm` → `Bm`, `F/Bb` → `F/B`).
  Achtung: Abenteuerland schreibt noch `Bb`; die Testreferenz wird dafür angepasst.
- Kreuz/b-Schreibweise wie bei UG (`Db`, `C#m`), keine Umdeutung.

### Option „Lagerfeuer-Akkorde“ (Schalter in der Weboberfläche)

Standardmäßig aus. Wenn an, gelten diese Regeln (abgeleitet aus Abenteuerland, Handfassung vs. UG):

| Regel                                                        | Beispiel                                   |
| ------------------------------------------------------------ | ------------------------------------------ |
| Slash-Akkorde: Bass weglassen                                | `Ab/Gb` → `Ab`, `F/A` → `F`, `Db/F` → `Db` |
| `maj7` weglassen                                             | `Dbmaj7` → `Db`                            |
| `mmaj7` → Moll                                               | `Dbmmaj7` → `Dbm`                          |
| Powerchord `5` → Dur                                         | `Db5` → `Db`                               |
| `sus2`/`sus4` weglassen                                      | `Ebsus4` → `Eb`                            |
| Gleiche Akkorde direkt hintereinander in einer Zeile → einer | `G … G … G` → `G`                          |
| bleibt erhalten                                              | `7`, `m7`, `m`, `add9`                     |

Mit allen Regeln ergibt UG-Abenteuerland genau die Akkorde der Handfassung.

### Manuelles Ersetzen

Die Weboberfläche zeigt alle Akkorde, die im Lied vorkommen (in deutscher Schreibweise, nach der
optionalen Vereinfachung), jeweils mit Anzahl. Pro Akkord kann man einen Ersatz eintragen; er gilt
für **alle** Vorkommen im Lied. Leeres Feld = unverändert, „entfernen“ = Akkord fällt an allen
Stellen weg (der Text bleibt).

### Reihenfolge der Akkord-Verarbeitung

1. UG-Akkord einlesen (englisch)
2. optional „Lagerfeuer-Akkorde“
3. deutsche Schreibweise (`B` → `H`, `Bb` → `B`)
4. manuelles Ersetzen
5. doppelte Akkorde in einer Zeile zusammenfassen (nur wenn 2. aktiv)
6. Griffbilder auswählen – es werden genau die Akkorde aktiviert, die am Ende im Lied stehen

## 3. Griffbilder (`\gtab`)

- Es gibt einen zentralen **Griffbild-Katalog** im Repo: [`chords/catalog.tex`](../chords/catalog.tex),
  eine Zeile pro Akkord in fester Reihenfolge.
- Pro Lied wird der **ganze Katalog** ausgegeben; Akkorde, die im Lied vorkommen, sind aktiv, alle
  anderen auskommentiert:

  ```tex
    \gtab{Am}{X02210:002310}\ \ \ \ \ % Hiermit kann man Tabs der Akkorde einfügen
  %  \gtab{A7}{X02020:001020}\ \ \ \ \ % Hiermit kann man Tabs der Akkorde einfügen
  ```

- Kommt ein Akkord im Lied vor, der nicht im Katalog steht, **rät** das Tool ein Standard-Griffbild
  aus einer Akkord-Datenbank, schreibt es aktiv mit dem Kommentar `% GERATEN – bitte prüfen` ans Ende
  des Blocks und gibt eine **Warnung** aus. Gibt es auch dort nichts, kommt eine Zeile
  `% TODO \gtab{Xyz}{…}`. Bestätigte Griffbilder werden in den Katalog übernommen.
- Der Katalog wurde aus den bestehenden Liedern erstellt. Widersprüche und verdächtige Einträge sind
  dort mit `KONFLIKT` bzw. `PRÜFEN` markiert und müssen einmal geklärt werden.
- Der Kommentar wird sauber als „einfügen“ geschrieben (in 61 Dateien steht er doppelt kodiert als
  „einfÃ¼gen“).

## 4. Abschnitte

| Typ               | LaTeX                            | Wann (Vorschlag des Tools)                                                                                              |
| ----------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Strophe           | `\beginverse … \endverse`        | UG `[Verse]`, `[Verse 1]`, `[Strophe]`, …                                                                               |
| Strophe ungezählt | `\beginverse* … \endverse`       | `[Outro]`/`[Intro]`/unbekannt **mit** Text                                                                              |
| Instrumental      | `\beginverse*` + `{\nolyrics …}` | Abschnitte **nur aus Akkorden** – egal wie sie heißen (`[Intro]`, `[Solo]`, `[Interlude]`, `[Instrumental]`, `[Outro]`) |
| Bridge            | `\beginbridge … \endbridge`      | `[Bridge]`, `[Pre-Chorus]`, `[Build]`, `[Drop]`                                                                         |
| Refrain           | `\beginchorus … \endchorus`      | `[Chorus]`, `[Refrain]`, `[Post-Chorus]`                                                                                |

Abgleich mit den Handfassungen: In Abenteuerland und Wackelkontakt treffen diese Regeln alle
14 Abschnitte richtig. Nicht automatisierbar war nur Handarbeit am Inhalt (Abenteuerland: die
letzten zwei Bridge-Zeilen als eigener Refrain, Zeilen neu umbrochen, Anführungszeichen ergänzt).

- Der Nutzer kann den Typ jedes Abschnitts vor dem Export ändern (Auswahlliste pro Abschnitt in
  der Weboberfläche).
- Jede Textzeile endet mit `\\` (auch die letzte eines Abschnitts).
- Kein Einrücken im Abschnitt. Zwischen Abschnitten eine Leerzeile.
- Wiederholte Refrains werden **vollständig** ausgeschrieben (kein `^`, keine Abkürzung).
- Wiederholung (UG `x2`, `(2x)`, `[x2]`) → `\rep{2}` als eigene Zeile vor `\endchorus` bzw. `\endverse`.

### Instrumental (`\nolyrics`)

Kanonische Form – eine Zeile pro UG-Akkordzeile, Akkorde durch Leerzeichen getrennt:

```tex
\beginverse*
{\nolyrics \[Am] \[C] \[Em] \[D]}\\
{\nolyrics \[Am] \[C] \[Em] \[F] \rep{2}}\\
\endverse
```

Takt- und Strichzeichen aus UG (`|`, `-`, `/`, `...`) werden entfernt.
Tabulaturen (`[tab]`-Blöcke mit `e|---|`) werden **nicht** übernommen (im Liederbuch tauchen sie nur
als Fehler auf, z. B. `\[D|---------|]`).

## 5. Text

- `„…“` und `"…"` → `\glqq …\grqq`.
- LaTeX-Sonderzeichen werden maskiert: `& % $ # _ { } ~ ^ \`.
- Apostrophe (`'`, `’`) und Umlaute bleiben unverändert.
- Leerzeichen innerhalb einer Zeile werden auf eins reduziert (außer nach Akkord am Zeilenanfang, s. 2).

## 6. Eingabe: Ultimate Guitar

Geprüft mit zwei echten Seiten (lokal in `examples/ug/`, nicht im Repo):

- Ein normaler HTTP-Abruf der Tab-URL funktioniert (kein Cloudflare-Block, Stand 2026-11-14).
- Die Songdaten stehen als JSON im Attribut `data-content` von `<div class="js-store">`:
  - `store.page.data.tab` → `song_name`, `artist_name`, `type` (nur `Chords` unterstützen)
  - `store.page.data.tab_view.meta` → `capo`, `tonality`, `tuning`
  - `store.page.data.tab_view.wiki_tab.content` → der eigentliche Text
- Aufbau von `content`:
  - `[Abschnitt]`-Überschriften, optional mit Wiederholung: `[Chorus] (x2)` → `\rep{2}`.
  - `[tab]Akkordzeile\nTextzeile[/tab]` = ein Paar; die Spalte des Akkords bestimmt die Position im
    Text (stimmt zeichengenau mit den Handfassungen überein, z. B. `H\[C]immel`).
  - Akkordzeilen ohne `[tab]` = reine Akkordzeilen → `\nolyrics`. Taktstriche `|` entfernen.
  - Akkorde stehen in `[ch]…[/ch]`; `N.C.` steht **ohne** `[ch]` und muss extra erkannt werden.
  - Alles vor der ersten Überschrift (Titel, „Tabbed by“, Release-Info, YouTube/Spotify-Links) wird
    verworfen.
- UG streut **kyrillische Doppelgänger-Buchstaben** in den Text (z. B. `е` U+0435 statt `e` in
  „Sicherungеn“). Die werden auf lateinische Buchstaben zurückgeführt, sonst bricht LaTeX/Suche.
- Fallback, falls UG den Abruf künftig blockiert: Text von UG einfügen (gleiches Format ohne
  `[ch]`-Markierungen, über den ChordSheetJS-`UltimateGuitarParser`).

## 7. Nicht automatisiert (bleibt Handarbeit)

`\songcolumns` ≠ 1, `\sclearpage`/Seitenumbrüche in `main.tex`, `\echo{…}`, `\textnote{…}`,
`\ifchorded`, `^`-Akkordwiederholungen, Einträge in `main.tex`.
