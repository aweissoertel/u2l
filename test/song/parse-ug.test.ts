import { describe, expect, it } from "vitest";
import {
  parseChordLine,
  parseRepeat,
  parseUgContent,
  placeChords,
} from "../../src/song/parse-ug.ts";
import type { LyricsLine } from "../../src/song/types.ts";

/** Kurzform: Segmente als `\[C]text`-String. */
function render(line: LyricsLine | undefined): string {
  if (!line) return "<keine Zeile>";
  return (
    (line.leadingPause ? "‖" : "") +
    line.segments.map((s) => (s.chord ? `[${s.chord}]` : "") + s.text).join("")
  );
}

describe("parseChordLine", () => {
  it("liest [ch]-Akkorde mit ihrer Spalte ohne Markup", () => {
    expect(parseChordLine("[ch]Am[/ch]      [ch]C[/ch]")).toEqual({
      chords: [
        { name: "Am", column: 0 },
        { name: "C", column: 8 },
      ],
      repeat: null,
    });
  });

  it("erkennt N.C., Taktstriche und Wiederholungen", () => {
    expect(parseChordLine("| [ch]Am[/ch]  N.C. | x2")).toEqual({
      chords: [
        { name: "Am", column: 2 },
        { name: "N.C.", column: 6 },
      ],
      repeat: 2,
    });
  });

  it("erkennt Akkordzeilen ohne Markup, außer Markup ist Pflicht", () => {
    expect(parseChordLine("Am   C/G  F#m7")?.chords.map((c) => c.name)).toEqual([
      "Am",
      "C/G",
      "F#m7",
    ]);
    expect(parseChordLine("Em", true)).toBeNull();
  });

  it("lehnt Textzeilen ab", () => {
    expect(parseChordLine("Am Abend geh ich heim")).toBeNull();
    expect(parseChordLine("[ch]Am[/ch] und Text")).toBeNull();
  });
});

describe("placeChords", () => {
  it("setzt Akkorde spaltengenau, auch mitten ins Wort", () => {
    const line = placeChords("Der triste Himmel", [{ name: "C", column: 12 }]);
    expect(render(line)).toBe("Der triste H[C]immel");
  });

  it("merkt sich eine Pause nach einem Akkord am Zeilenanfang", () => {
    const line = placeChords("  Der triste Himmel", [
      { name: "Am", column: 0 },
      { name: "C", column: 14 },
    ]);
    expect(render(line)).toBe("‖[Am]Der triste H[C]immel");
  });

  it("schiebt Akkorde von Leerzeichen auf das nächste Wort", () => {
    expect(render(placeChords("eins   zwei", [{ name: "G", column: 5 }]))).toBe("eins [G]zwei");
  });

  it("hängt Akkorde hinter dem Textende an", () => {
    expect(
      render(
        placeChords("Ende.", [
          { name: "F", column: 7 },
          { name: "G", column: 10 },
        ]),
      ),
    ).toBe("Ende.[F][G]");
  });

  it("fasst Leerzeichen zusammen", () => {
    expect(render(placeChords("a    b   c", [{ name: "D", column: 5 }]))).toBe("a [D]b c");
  });
});

describe("parseRepeat", () => {
  it.each([
    ["(x2)", 2],
    ["x3", 3],
    ["2x", 2],
    ["(4x)", 4],
    ["", null],
    ["x1", null],
  ])("%j → %j", (input, expected) => {
    expect(parseRepeat(input)).toBe(expected);
  });
});

describe("parseUgContent", () => {
  const content = [
    "Testlied",
    "Die Testband",
    "Tabbed by jemand",
    "",
    "[Intro]",
    "[ch]Am[/ch]  [ch]C[/ch]  | [ch]G[/ch] |",
    "",
    "[Verse 1]",
    "[tab][ch]Am[/ch]            [ch]C[/ch]",
    "  Ein erfundener Text hier[/tab]",
    "Zeile ohne Akkorde",
    "",
    "[Chorus] (x2)",
    "[tab]    N.C.     [ch]G[/ch]",
    "Kurz und laut gesungen[/tab]",
    "[tab]e|---3---|",
    "B|---0---|[/tab]",
  ].join("\n");

  it("verwirft den Vorspann und liest Abschnitte", () => {
    const sections = parseUgContent(content);
    expect(sections.map((s) => [s.name, s.repeat])).toEqual([
      ["Intro", null],
      ["Verse 1", null],
      ["Chorus", 2],
    ]);
  });

  it("unterscheidet Akkordzeilen, Textzeilen mit und ohne Akkorde", () => {
    const [intro, verse, chorus] = parseUgContent(content);
    expect(intro!.lines).toEqual([{ kind: "chords", chords: ["Am", "C", "G"], repeat: null }]);
    expect(verse!.lines.map((l) => (l.kind === "lyrics" ? render(l) : l.kind))).toEqual([
      "‖[Am]Ein erfunden[C]er Text hier",
      "Zeile ohne Akkorde",
    ]);
    expect(chorus!.lines).toHaveLength(1);
    expect(render(chorus!.lines[0] as LyricsLine)).toBe("Kurz [N.C.]und laut [G]gesungen");
  });

  it("behält Vorspann mit Akkorden, wenn es keine Überschrift davor gibt", () => {
    const sections = parseUgContent("[ch]G[/ch]\nNur ein Lied\n[Chorus]\n[ch]C[/ch]\nRefrain");
    expect(sections.map((s) => s.name)).toEqual(["", "Chorus"]);
  });

  it("kommt ohne Überschriften und ohne [ch]-Markup aus (eingefügter Text)", () => {
    const sections = parseUgContent("G        C\nErste Zeile hier\nD\nZweite");
    expect(sections).toHaveLength(1);
    expect(sections[0]!.lines.map((l) => render(l as LyricsLine))).toEqual([
      "[G]Erste Zei[C]le hier",
      "[D]Zweite",
    ]);
  });
});
