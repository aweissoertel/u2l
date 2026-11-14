import { usedChords } from "../song/chords.ts";
import type { ChordsLine, LyricsLine, Section, SectionType } from "../song/types.ts";
import type { CatalogEntry } from "./catalog.ts";
import { escapeLatex, type QuoteState } from "./escape.ts";

export interface SongMeta {
  title: string;
  artist: string;
  capo: number | null;
}

export interface FormatResult {
  tex: string;
  warnings: string[];
}

const GTAB_COMMENT = "% Hiermit kann man Tabs der Akkorde einfügen";

const ENVIRONMENTS: Record<Exclude<SectionType, "omit">, [string, string]> = {
  verse: ["\\beginverse", "\\endverse"],
  "verse*": ["\\beginverse*", "\\endverse"],
  instrumental: ["\\beginverse*", "\\endverse"],
  bridge: ["\\beginbridge", "\\endbridge"],
  chorus: ["\\beginchorus", "\\endchorus"],
};

/** Akkordname in `\[…]`. Zeichen, die LaTeX/songs stören würden, fliegen raus (`#` bleibt: Kreuz). */
function chord(name: string): string {
  return `\\[${name.replace(/[\\{}[\]%$&_~^\s]/g, "")}]`;
}

function formatLyrics(line: LyricsLine): string {
  const quotes: QuoteState = { open: false };
  let out = "";
  line.segments.forEach((seg, i) => {
    if (seg.chord !== null) out += chord(seg.chord);
    if (i === 0 && line.leadingPause && seg.chord !== null) out += "  ";
    out += escapeLatex(seg.text, quotes);
  });
  return `${out}\\\\`;
}

function formatChordsLine(line: ChordsLine): string | null {
  if (line.chords.length === 0) return null;
  const rep = line.repeat ? ` \\rep{${line.repeat}}` : "";
  return `{\\nolyrics ${line.chords.map(chord).join(" ")}${rep}}\\\\`;
}

function formatSection(section: Section, type: SectionType): string | null {
  if (type === "omit") return null;
  const body = section.lines
    .map((l) => (l.kind === "lyrics" ? formatLyrics(l) : formatChordsLine(l)))
    .filter((l): l is string => l !== null);
  if (body.length === 0) return null;
  if (section.repeat) body.push(`\\rep{${section.repeat}}`);
  const [begin, end] = ENVIRONMENTS[type];
  return [begin, ...body, end].join("\n");
}

function formatGtabs(
  sections: Section[],
  catalog: CatalogEntry[],
): { lines: string[]; missing: string[] } {
  const used = usedChords(sections);
  const known = new Set(catalog.map((e) => e.name));
  const lines = catalog.map(({ name, shape }) => {
    const gtab = `\\gtab{${name}}{${shape}}\\ \\ \\ \\ \\ ${GTAB_COMMENT}`;
    return used.has(name) ? `  ${gtab}` : `%  ${gtab}`;
  });
  const missing = [...used].filter((c) => !known.has(c));
  for (const name of missing) lines.push(`% TODO \\gtab{${name}}{…} % Griffbild fehlt im Katalog`);
  return { lines, missing };
}

/** Erzeugt die .tex-Datei nach docs/format.md. */
export function formatSong(
  meta: SongMeta,
  sections: Section[],
  types: SectionType[],
  catalog: CatalogEntry[],
): FormatResult {
  const warnings: string[] = [];
  const active = sections.filter((_, i) => types[i] !== "omit");
  const { lines: gtabs, missing } = formatGtabs(active, catalog);
  if (missing.length > 0) {
    warnings.push(
      `Kein Griffbild im Katalog für: ${missing.join(", ")}. In der Datei steht dafür eine TODO-Zeile.`,
    );
  }

  const header = [
    "\\songcolumns{1} % auf wie viele Spalten ist das Lied aufgeteilt. Standard: 1",
    "",
    `\\beginsong{${escapeLatex(meta.title)}} % Name des Liedes`,
    `  [by={${escapeLatex(meta.artist)}} % Autor des Liedes`,
    "  ]",
    "",
  ];
  if (meta.capo) header.push(`\\capo{${meta.capo}} % Capo Nummer`, "");

  const body = sections
    .map((s, i) => formatSection(s, types[i] ?? "verse*"))
    .filter((s): s is string => s !== null);

  const tex = [...header, ...gtabs, "", "", "", body.join("\n\n"), "", "\\endsong", ""].join("\n");
  return { tex, warnings };
}
