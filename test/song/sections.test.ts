import { describe, expect, it } from "vitest";
import { guessSectionType } from "../../src/song/sections.ts";
import type { Line, Section } from "../../src/song/types.ts";

const lyrics: Line = {
  kind: "lyrics",
  leadingPause: false,
  segments: [{ chord: "C", text: "la" }],
};
const chords: Line = { kind: "chords", chords: ["C"], repeat: null };
const section = (name: string, lines: Line[] = [lyrics]): Section => ({
  name,
  repeat: null,
  lines,
});

describe("guessSectionType", () => {
  it.each([
    ["Verse 1", "verse"],
    ["Strophe", "verse"],
    ["Chorus", "chorus"],
    ["Refrain", "chorus"],
    ["Post-Chorus", "chorus"],
    ["Bridge", "bridge"],
    ["Pre-Chorus", "bridge"],
    ["Build", "bridge"],
    ["Drop", "bridge"],
    ["Outro", "verse*"],
    ["Intro", "verse*"],
    ["", "verse*"],
  ])("%j mit Text → %s", (name, expected) => {
    expect(guessSectionType(section(name))).toBe(expected);
  });

  it("nimmt für reine Akkord-Abschnitte immer instrumental", () => {
    expect(guessSectionType(section("Chorus", [chords, chords]))).toBe("instrumental");
    expect(guessSectionType(section("Solo", [chords]))).toBe("instrumental");
  });
});
