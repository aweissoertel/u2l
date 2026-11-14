/**
 * Tests gegen echte, lokal gespeicherte UG-Seiten aus examples/ug/ (nicht im Repo).
 * Fehlen die Dateien (z. B. in CI), werden die Tests übersprungen.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractUgTab } from "../../src/ug/extract.ts";

const CASES = [
  {
    file: "examples/ug/abenteuerland-chords-346484.html",
    url: "https://tabs.ultimate-guitar.com/tab/pur/abenteuerland-chords-346484",
    title: "Abenteuerland",
    artist: "Pur",
    sections: ["Intro", "Verse 1", "Chorus", "Interlude", "Verse 2", "Chorus", "Bridge", "Chorus"],
  },
  {
    file: "examples/ug/wackelkontakt-chords-5648541.html",
    url: "https://tabs.ultimate-guitar.com/tab/oimara/wackelkontakt-chords-5648541",
    title: "Wackelkontakt",
    artist: "Oimara",
    sections: [
      "Build",
      "Drop",
      "Refrain",
      "Instrumental",
      "Strophe",
      "Build",
      "Drop",
      "Refrain",
      "Outro",
    ],
  },
];

describe.each(CASES)("echte UG-Seite: $title", (c) => {
  it.skipIf(!existsSync(c.file))("wird vollständig gelesen", () => {
    const tab = extractUgTab(readFileSync(c.file, "utf8"), c.url);
    expect(tab.title).toBe(c.title);
    expect(tab.artist).toBe(c.artist);
    expect(tab.type).toBe("Chords");
    expect([...tab.content.matchAll(/^\[([^\]]+)\]/gm)].map((m) => m[1])).toEqual(
      expect.arrayContaining(c.sections),
    );
    // keine kyrillischen Doppelgänger mehr
    expect(tab.content).not.toMatch(/\p{Script=Cyrillic}/u);
  });
});
