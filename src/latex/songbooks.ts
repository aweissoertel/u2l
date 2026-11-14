/**
 * Verweise auf andere Liederbücher – Song-Keys aus unserer Präambel (`\newsongkey`).
 * Reihenfolge und Kommentare wie in der Liedvorlage.
 */
export const SONGBOOKS = [
  {
    key: "LSVE",
    label: "Swapingo alt (Lied-Nr.)",
    comment: "Liederbuchnummer im alten Swapingo Liederbuch",
  },
  {
    key: "LCopacaBeLa",
    label: "CopacaBeLa (Seite)",
    comment: "Seitennuummer im CopacaBeLa Liederbuch",
  },
  {
    key: "LIsarBeLa",
    label: "IsarBeLa (Lied-Nr.)",
    comment: "Liederbuchnummer im IsarBeLa Liederbuch",
  },
  { key: "LLiederbock", label: "Liederbock (Seite)", comment: "Seitennummer im Liederbock" },
  { key: "LDoppelbock", label: "Doppelbock (Seite)", comment: "Seitennummer im Doppelbock" },
] as const;

export type SongbookKey = (typeof SONGBOOKS)[number]["key"];
export type SongbookRefs = Partial<Record<SongbookKey, string>>;

const VALUE_RE = /^[\p{L}\p{N} .,/-]{1,10}$/u;

/** Übernimmt nur bekannte Keys mit kurzen, harmlosen Werten (Nummern, „12a“, „3/4“ …). */
export function cleanSongbookRefs(input: Record<string, unknown>): SongbookRefs {
  const refs: SongbookRefs = {};
  for (const { key } of SONGBOOKS) {
    const value = input[key];
    if (typeof value === "string" && VALUE_RE.test(value.trim())) refs[key] = value.trim();
  }
  return refs;
}
