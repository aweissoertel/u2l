import { loadCatalog, type CatalogEntry } from "./latex/catalog.ts";
import { songFilename } from "./latex/filename.ts";
import { formatSong } from "./latex/format.ts";
import { countChords, processChords } from "./song/chords.ts";
import { parseUgContent } from "./song/parse-ug.ts";
import { guessSectionType } from "./song/sections.ts";
import { SECTION_TYPES, type Section, type SectionType } from "./song/types.ts";
import type { UgTab } from "./ug/types.ts";

export interface ConvertOptions {
  simplify?: boolean;
  /** Abschnitts-Typ pro Index; fehlt einer, gilt der Vorschlag. */
  sectionTypes?: Record<number, SectionType>;
  /** Manuelles Ersetzen (deutsche Namen); `""` = entfernen. */
  replace?: Record<string, string>;
}

export interface SectionSummary {
  index: number;
  name: string;
  guess: SectionType;
  type: SectionType;
  /** Erste Textzeile bzw. Akkorde, damit man den Abschnitt in der Oberfläche erkennt. */
  preview: string;
}

export interface ConvertResult {
  filename: string;
  tex: string;
  sections: SectionSummary[];
  /** Akkorde vor dem manuellen Ersetzen, mit Anzahl und ob es ein Griffbild gibt. */
  chords: { name: string; count: number; inCatalog: boolean }[];
  warnings: string[];
}

function preview(section: Section): string {
  const line = section.lines[0];
  if (!line) return "";
  const text =
    line.kind === "chords" ? line.chords.join(" ") : line.segments.map((s) => s.text).join("");
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

export function convertTab(
  tab: Pick<UgTab, "title" | "artist" | "capo" | "content">,
  options: ConvertOptions = {},
  catalog: CatalogEntry[] = loadCatalog(),
): ConvertResult {
  const parsed = parseUgContent(tab.content);
  const simplify = options.simplify ?? false;

  const sections: SectionSummary[] = parsed.map((s, index) => {
    const guess = guessSectionType(s);
    const chosen = options.sectionTypes?.[index];
    const type = chosen && SECTION_TYPES.includes(chosen) ? chosen : guess;
    return { index, name: s.name, guess, type, preview: preview(s) };
  });

  const processed = processChords(parsed, { simplify, replace: options.replace ?? {} });
  const { tex, warnings } = formatSong(
    { title: tab.title, artist: tab.artist, capo: tab.capo },
    processed,
    sections.map((s) => s.type),
    catalog,
  );

  const known = new Set(catalog.map((e) => e.name));
  const chords = [...countChords(parsed, simplify)]
    .filter(([name]) => name !== "N.C.")
    .map(([name, count]) => ({ name, count, inCatalog: known.has(name) }));

  if (parsed.length === 0) warnings.push("Im Text wurden keine Abschnitte gefunden.");

  return { filename: songFilename(tab.title), tex, sections, chords, warnings };
}
