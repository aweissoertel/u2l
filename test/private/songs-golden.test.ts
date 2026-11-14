/**
 * Abnahmetests gegen echte UG-Seiten und unsere Handfassungen (nur lokal, examples/ ist gitignored).
 *
 * - expected/*.tex: geprüfte Ausgabe des Tools (bei gewollten Änderungen neu erzeugen und Diff prüfen)
 * - reference/wackelkontakt.tex: Handfassung aus dem Liederbuch – Text und Akkorde müssen exakt
 *   übereinstimmen (Griffbild-Block ausgenommen, der folgt dem Katalog)
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertTab } from "../../src/convert.ts";
import { extractUgTab } from "../../src/ug/extract.ts";

const ug = (file: string) =>
  extractUgTab(readFileSync(`examples/ug/${file}.html`, "utf8"), "https://example.invalid");

const has = (...files: string[]) => files.every((f) => existsSync(f));

/** Ohne Griffbilder, Leerzeilen und Zeilenende-Leerzeichen; Kommentar-Kodierung repariert. */
function body(tex: string): string {
  return tex
    .replace(/einfÃ¼gen/g, "einfügen")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l !== "" && !l.includes("\\gtab"))
    .join("\n");
}

describe("Wackelkontakt", () => {
  const files = [
    "examples/ug/wackelkontakt-chords-5648541.html",
    "examples/reference/wackelkontakt.tex",
  ];

  it.skipIf(!has(...files))("entspricht in Text und Akkorden genau der Handfassung", () => {
    const { tex } = convertTab(ug("wackelkontakt-chords-5648541"));
    expect(body(tex)).toBe(body(readFileSync(files[1]!, "utf8")));
  });

  it.skipIf(!has(files[0]!, "examples/expected/wackelkontakt.tex"))("entspricht expected/", () => {
    const { tex } = convertTab(ug("wackelkontakt-chords-5648541"));
    expect(tex).toBe(readFileSync("examples/expected/wackelkontakt.tex", "utf8"));
  });
});

describe("Abenteuerland", () => {
  const html = "examples/ug/abenteuerland-chords-346484.html";

  it.skipIf(!has(html, "examples/expected/abenteuerland.tex"))("entspricht expected/", () => {
    expect(convertTab(ug("abenteuerland-chords-346484")).tex).toBe(
      readFileSync("examples/expected/abenteuerland.tex", "utf8"),
    );
  });

  it.skipIf(!has(html, "examples/expected/abenteuerland.simple.tex"))(
    "entspricht expected/ mit Lagerfeuer-Akkorden",
    () => {
      const result = convertTab(ug("abenteuerland-chords-346484"), { simplify: true });
      expect(result.tex).toBe(readFileSync("examples/expected/abenteuerland.simple.tex", "utf8"));
      expect(result.warnings).toEqual([]);
    },
  );

  it.skipIf(!has(html, "examples/reference/abenteuerland.tex"))(
    "nutzt mit Lagerfeuer-Akkorden genau die Akkorde der Handfassung",
    () => {
      const chordsIn = (tex: string) =>
        new Set([...body(tex).matchAll(/\\\[([^\]]+)\]/g)].map((m) => m[1]!.replace(/^Bb$/, "B")));
      const tool = convertTab(ug("abenteuerland-chords-346484"), { simplify: true }).tex;
      const hand = readFileSync("examples/reference/abenteuerland.tex", "utf8");
      expect(chordsIn(tool)).toEqual(chordsIn(hand));
    },
  );
});
