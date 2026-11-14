const SPECIAL: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

/** Zustand der Anführungszeichen über mehrere Textstücke einer Zeile hinweg. */
export interface QuoteState {
  open: boolean;
}

/**
 * Maskiert LaTeX-Sonderzeichen und setzt deutsche Anführungszeichen (`\glqq …\grqq{}`).
 * `"` und `“` öffnen bzw. schließen abwechselnd, `„` öffnet immer, `”` schließt immer.
 */
export function escapeLatex(text: string, quotes: QuoteState = { open: false }): string {
  let out = "";
  for (const ch of text) {
    if (ch === "„" || ((ch === '"' || ch === "“") && !quotes.open)) {
      out += "\\glqq ";
      quotes.open = true;
    } else if (ch === "”" || ch === '"' || ch === "“") {
      out += "\\grqq{}";
      quotes.open = false;
    } else {
      out += SPECIAL[ch] ?? ch;
    }
  }
  return out;
}
