import { readFileSync } from "node:fs";

export interface CatalogEntry {
  name: string;
  shape: string;
}

const GTAB_RE = /^\\gtab\{([^}]*)\}\{([^}]*)\}/;

/** Liest `chords/catalog.tex`: eine `\gtab`-Zeile pro Akkord, Kommentare werden ignoriert. */
export function parseCatalog(text: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const line of text.split("\n")) {
    const m = GTAB_RE.exec(line.trim());
    if (m) entries.push({ name: m[1]!, shape: m[2]! });
  }
  return entries;
}

let cached: CatalogEntry[] | undefined;

/** Lädt den Katalog aus dem Repo (src/ und dist/ liegen gleich tief). */
export function loadCatalog(): CatalogEntry[] {
  cached ??= parseCatalog(
    readFileSync(new URL("../../chords/catalog.tex", import.meta.url), "utf8"),
  );
  return cached;
}
