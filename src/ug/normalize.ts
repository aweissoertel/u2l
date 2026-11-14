/**
 * Kyrillische und griechische Buchstaben, die wie lateinische aussehen.
 * UG streut solche Doppelgänger in Songtexte (z. B. „Sicherungеn“ mit kyrillischem е).
 */
const HOMOGLYPHS: Record<string, string> = {
  // Kyrillisch klein
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ј: "j",
  ѕ: "s",
  ԁ: "d",
  ӏ: "l",
  һ: "h",
  ԛ: "q",
  ԝ: "w",
  // Kyrillisch groß
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  Х: "X",
  У: "Y",
  І: "I",
  Ј: "J",
  Ѕ: "S",
  // Griechisch
  α: "a",
  ο: "o",
  ν: "v",
  ι: "i",
  Α: "A",
  Β: "B",
  Ε: "E",
  Ζ: "Z",
  Η: "H",
  Ι: "I",
  Κ: "K",
  Μ: "M",
  Ν: "N",
  Ο: "O",
  Ρ: "P",
  Τ: "T",
  Υ: "Y",
  Χ: "X",
};
const HOMOGLYPH_RE = new RegExp(`[${Object.keys(HOMOGLYPHS).join("")}]`, "g");

/** Ein „Wort“ = zusammenhängende Buchstaben (inkl. Doppelgänger). */
const WORD_RE = /[\p{L}\p{M}]+/gu;
const LATIN_RE = /\p{Script=Latin}/u;

/** Ersetzt Doppelgänger nur in Wörtern, die auch lateinische Buchstaben enthalten. */
function fixHomoglyphs(text: string): string {
  return text.replace(WORD_RE, (word) =>
    LATIN_RE.test(word) ? word.replace(HOMOGLYPH_RE, (ch) => HOMOGLYPHS[ch] ?? ch) : word,
  );
}

/**
 * Bereinigt Text aus UG: Zeilenenden, unsichtbare Zeichen, geschützte Leerzeichen,
 * Unicode-Normalform und Doppelgänger-Buchstaben. Die sichtbaren Spaltenpositionen bleiben
 * erhalten: Doppelgänger werden 1:1 ersetzt, entfernt werden nur Zeichen ohne Breite, und NFC
 * fasst z. B. „u + ¨“ zu einem Zeichen zusammen – so wie UG es auch anzeigt.
 */
export function normalizeUgText(text: string): string {
  return fixHomoglyphs(
    text
      .replace(/\r\n?/g, "\n")
      .replace(/[​-‍⁠﻿­]/g, "")
      .replace(/[   ]/g, " ")
      .normalize("NFC"),
  );
}
