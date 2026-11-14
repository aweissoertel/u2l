const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

/** Dateiname aus dem Titel: klein, snake_case, Umlaute als ae/oe/ue/ss. */
export function songFilename(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => UMLAUTS[ch]!)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "lied"}.tex`;
}
