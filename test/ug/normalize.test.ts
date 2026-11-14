import { describe, expect, it } from "vitest";
import { normalizeUgText } from "../../src/ug/normalize.js";

describe("normalizeUgText", () => {
  it("ersetzt kyrillische Doppelgänger in lateinischen Wörtern", () => {
    expect(normalizeUgText("Sicherungеn einе Lampe")).toBe("Sicherungen eine Lampe");
  });

  it("lässt echte kyrillische Wörter in Ruhe", () => {
    expect(normalizeUgText("Катюша und Kаtjuscha")).toBe("Катюша und Katjuscha");
  });

  it("vereinheitlicht Zeilenenden, Leerzeichen und unsichtbare Zeichen", () => {
    expect(normalizeUgText("a\r\nb\rc d​e")).toBe("a\nb\nc de");
  });

  it("setzt zerlegte Umlaute zusammen, ohne Spalten zu verschieben", () => {
    const decomposed = "Möbel";
    expect(normalizeUgText(decomposed)).toBe("Möbel");
  });

  it("ersetzt Zeichen 1:1, damit Akkordspalten stimmen", () => {
    const line = "Wär ich ein Möbelstück, dann wär ich einе Lampe";
    expect(normalizeUgText(line)).toHaveLength(line.length);
  });
});
