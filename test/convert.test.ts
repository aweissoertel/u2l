import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertTab } from "../src/convert.ts";
import { loadCatalog, parseCatalog } from "../src/latex/catalog.ts";

const catalog = parseCatalog(
  [
    "% Kommentar",
    "\\gtab{Am}{X02210:002310}",
    "\\gtab{C}{X32010:032010} % KONFLIKT",
    "\\gtab{G}{320003:210003}",
  ].join("\n"),
);

const tab = {
  title: "Testlied & Co",
  artist: "Die Testband",
  capo: 2,
  content: [
    "Testlied",
    "",
    "[Intro]",
    "[ch]Am[/ch]  [ch]C[/ch] (x2)",
    "",
    "[Verse 1]",
    "[tab][ch]Am[/ch]            [ch]C[/ch]",
    '  Ein erfundener "Text" mit 100%[/tab]',
    "",
    "[Chorus] (x2)",
    "[tab]     [ch]Bb[/ch]         [ch]G[/ch]",
    "Ein ganz kurzer Refrain[/tab]",
  ].join("\n"),
};

// Erwartete Ausgabe vollständig ausgeschrieben – das ist die Formatspezifikation als Test.
const EXPECTED = String.raw`\songcolumns{1} % auf wie viele Spalten ist das Lied aufgeteilt. Standard: 1

\beginsong{Testlied \& Co} % Name des Liedes
  [by={Die Testband} % Autor des Liedes
  ]

\capo{2} % Capo Nummer

  \gtab{Am}{X02210:002310}\ \ \ \ \ % Hiermit kann man Tabs der Akkorde einfügen
  \gtab{C}{X32010:032010}\ \ \ \ \ % Hiermit kann man Tabs der Akkorde einfügen
  \gtab{G}{320003:210003}\ \ \ \ \ % Hiermit kann man Tabs der Akkorde einfügen
% TODO \gtab{B}{…} % Griffbild fehlt im Katalog



\beginverse*
{\nolyrics \[Am] \[C] \rep{2}}\\
\endverse

\beginverse
\[Am]  Ein erfunden\[C]er \glqq Text\grqq{} mit 100\%\\
\endverse

\beginchorus
Ein g\[B]anz kurzer \[G]Refrain\\
\rep{2}
\endchorus

\endsong
`;

describe("convertTab", () => {
  it("erzeugt die .tex-Datei nach Spezifikation", () => {
    const result = convertTab(tab, {}, catalog);
    expect(result.tex).toBe(EXPECTED);
    expect(result.filename).toBe("testlied_co.tex");
    expect(result.warnings).toEqual([
      "Kein Griffbild im Katalog für: B. In der Datei steht dafür eine TODO-Zeile.",
    ]);
  });

  it("liefert Abschnitte mit Vorschlag und Akkorde mit Anzahl", () => {
    const result = convertTab(tab, {}, catalog);
    expect(result.sections).toEqual([
      { index: 0, name: "Intro", guess: "instrumental", type: "instrumental", preview: "Am C" },
      {
        index: 1,
        name: "Verse 1",
        guess: "verse",
        type: "verse",
        preview: 'Ein erfundener "Text" mit 100%',
      },
      {
        index: 2,
        name: "Chorus",
        guess: "chorus",
        type: "chorus",
        preview: "Ein ganz kurzer Refrain",
      },
    ]);
    expect(result.chords).toEqual([
      { name: "Am", count: 2, inCatalog: true },
      { name: "C", count: 2, inCatalog: true },
      { name: "B", count: 1, inCatalog: false },
      { name: "G", count: 1, inCatalog: true },
    ]);
  });

  it("übernimmt Abschnitts-Typen und Ersetzungen des Nutzers", () => {
    const result = convertTab(
      tab,
      { sectionTypes: { 0: "omit", 2: "bridge" }, replace: { B: "C" } },
      catalog,
    );
    expect(result.tex).not.toContain("nolyrics");
    expect(result.tex).toContain(
      "\\beginbridge\nEin g\\[C]anz kurzer \\[G]Refrain\\\\\n\\rep{2}\n\\endbridge",
    );
    expect(result.tex).not.toContain("TODO");
    expect(result.sections.map((s) => s.type)).toEqual(["omit", "verse", "bridge"]);
    expect(result.warnings).toEqual([]);
  });

  it("ignoriert ungültige Abschnitts-Typen", () => {
    const result = convertTab(tab, { sectionTypes: { 1: "quatsch" as never } }, catalog);
    expect(result.sections[1]!.type).toBe("verse");
  });

  it("lässt den Capo weg, wenn UG keinen angibt", () => {
    expect(convertTab({ ...tab, capo: null }, {}, catalog).tex).not.toContain("\\capo");
  });
});

describe("Griffbild-Katalog im Repo", () => {
  it("lässt sich lesen und hat eindeutige Namen", () => {
    const entries = loadCatalog();
    expect(entries.length).toBeGreaterThan(30);
    expect(new Set(entries.map((e) => e.name)).size).toBe(entries.length);
    expect(readFileSync(new URL("../chords/catalog.tex", import.meta.url), "utf8")).toContain(
      "\\gtab{H7}",
    );
  });
});
