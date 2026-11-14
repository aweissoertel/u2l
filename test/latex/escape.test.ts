import { describe, expect, it } from "vitest";
import { escapeLatex, type QuoteState } from "../../src/latex/escape.ts";
import { songFilename } from "../../src/latex/filename.ts";

describe("escapeLatex", () => {
  it("maskiert Sonderzeichen", () => {
    expect(escapeLatex("A & B 100% $5 #1 a_b {x} ~ ^ \\")).toBe(
      "A \\& B 100\\% \\$5 \\#1 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}",
    );
  });

  it("lässt Umlaute und Apostrophe stehen", () => {
    expect(escapeLatex("Käpt’n hab' ß")).toBe("Käpt’n hab' ß");
  });

  it("setzt deutsche Anführungszeichen, auch über Textstücke hinweg", () => {
    const quotes: QuoteState = { open: false };
    expect(escapeLatex('sagt: "Du sp', quotes) + escapeLatex('innst." Ja', quotes)).toBe(
      "sagt: \\glqq Du spinnst.\\grqq{} Ja",
    );
    expect(escapeLatex("„Hallo“ und “Hi”")).toBe("\\glqq Hallo\\grqq{} und \\glqq Hi\\grqq{}");
  });
});

describe("songFilename", () => {
  it.each([
    ["Wackelkontakt", "wackelkontakt.tex"],
    ["Flinke Hände", "flinke_haende.tex"],
    ["Nordwärts, Nordwärts!", "nordwaerts_nordwaerts.tex"],
    ["Große Straße", "grosse_strasse.tex"],
    ["What's Up?", "what_s_up.tex"],
    ["Café Olé", "cafe_ole.tex"],
    ["???", "lied.tex"],
  ])("%j → %s", (title, expected) => {
    expect(songFilename(title)).toBe(expected);
  });
});
