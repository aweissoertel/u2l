import { describe, expect, it } from "vitest";
import {
  countChords,
  processChords,
  simplifyChord,
  toGermanChord,
  usedChords,
} from "../../src/song/chords.ts";
import type { Section } from "../../src/song/types.ts";

describe("simplifyChord (Lagerfeuer-Akkorde)", () => {
  it.each([
    ["Ab/Gb", "Ab"],
    ["F/A", "F"],
    ["Dbmaj7", "Db"],
    ["Dbmmaj7", "Dbm"],
    ["Am(maj7)", "Am"],
    ["Db5", "Db"],
    ["Ebsus4", "Eb"],
    ["Dsus2", "D"],
    ["A7sus4", "A7"],
    ["G7", "G7"],
    ["Em7", "Em7"],
    ["Cadd9", "Cadd9"],
    ["N.C.", "N.C."],
  ])("%s → %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });
});

describe("toGermanChord", () => {
  it.each([
    ["B", "H"],
    ["Bm", "Hm"],
    ["B7", "H7"],
    ["Bb", "B"],
    ["Bbm", "Bm"],
    ["C/B", "C/H"],
    ["F/Bb", "F/B"],
    ["Bbmaj7/D", "Bmaj7/D"],
    ["C#m", "C#m"],
    ["Db", "Db"],
  ])("%s → %s", (input, expected) => {
    expect(toGermanChord(input)).toBe(expected);
  });
});

const song: Section[] = [
  {
    name: "Verse",
    repeat: null,
    lines: [
      {
        kind: "lyrics",
        leadingPause: true,
        segments: [
          { chord: "G", text: "eins " },
          { chord: "G", text: "zwei " },
          { chord: "Bb", text: "drei " },
          { chord: "F/A", text: "vier" },
        ],
      },
      { kind: "chords", chords: ["Bb", "Bb", "B", "N.C."], repeat: 2 },
    ],
  },
];

describe("processChords", () => {
  it("schreibt ohne weitere Optionen nur deutsch", () => {
    const [s] = processChords(song);
    expect(s!.lines[0]).toMatchObject({
      segments: [{ chord: "G" }, { chord: "G" }, { chord: "B" }, { chord: "F/A" }],
    });
    expect(s!.lines[1]).toMatchObject({ chords: ["B", "B", "H", "N.C."], repeat: 2 });
  });

  it("vereinfacht und fasst Doppelte zusammen", () => {
    const [s] = processChords(song, { simplify: true });
    expect(s!.lines[0]).toMatchObject({
      segments: [{ chord: "G" }, { chord: null }, { chord: "B" }, { chord: "F" }],
    });
    expect(s!.lines[1]).toMatchObject({ chords: ["B", "H", "N.C."] });
  });

  it("ersetzt manuell (deutsche Namen) und entfernt mit leerem Ersatz", () => {
    const [s] = processChords(song, { replace: { B: "C", G: "" } });
    expect(s!.lines[0]).toMatchObject({
      leadingPause: false,
      segments: [{ chord: null }, { chord: null }, { chord: "C" }, { chord: "F/A" }],
    });
    expect(s!.lines[1]).toMatchObject({ chords: ["C", "C", "H", "N.C."] });
  });
});

describe("countChords / usedChords", () => {
  it("zählt nach Vereinfachung und Eindeutschung", () => {
    expect(Object.fromEntries(countChords(song, true))).toEqual({
      G: 2,
      B: 3,
      F: 1,
      H: 1,
      "N.C.": 1,
    });
  });

  it("liefert die Akkorde im fertigen Lied ohne N.C.", () => {
    expect([...usedChords(processChords(song))].sort()).toEqual(["B", "F/A", "G", "H"]);
  });
});
