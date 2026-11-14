import type { ChordsLine, Line, LyricsLine, Section, Segment } from "./types.ts";

const HEADER_RE = /^\s*\[([^\]\[]+)\]\s*(.*)$/;
const NOT_HEADERS = new Set(["tab", "/tab", "ch", "/ch"]);
const CH_RE = /\[ch\](.*?)\[\/ch\]/g;
/** Englischer Akkordname, wie er bei UG vorkommt (ohne [ch]-Markup). */
const CHORD_TOKEN_RE =
  /^\(?[A-G](?:#|b)?(?:maj|min|mi|m|M|dim|aug|sus|add|\+|°|ø)?[0-9]*(?:(?:maj|sus|add|dim|aug|b|#|\+|-)?[0-9]+)*(?:sus[24]?)?(?:\/[A-G](?:#|b)?)?\*?\)?$/;
const NC_RE = /^\(?N\.?C\.?\)?$/i;
const REPEAT_RE = /^\(?(?:x\s?(\d+)|(\d+)\s?x)\)?$/i;
const FILLER_RE = /^(?:\|+|-+|\/+|\.{2,}|%|:?\|\|?:?)$/;
/** Tabulatur-Zeilen wie `e|---3---|` werden ignoriert. */
const TAB_STAFF_RE = /^\s*[A-Ga-g]?[#b]?\s*\|[-0-9|hpbrsx\/\\~().*=\s]*$/;

export function parseRepeat(text: string): number | null {
  const m = /(?:\bx\s?(\d+)\b|\b(\d+)\s?x\b)/i.exec(text);
  const n = m ? Number(m[1] ?? m[2]) : NaN;
  return Number.isInteger(n) && n > 1 && n < 20 ? n : null;
}

interface PositionedChord {
  name: string;
  column: number;
}

interface ChordLineInfo {
  chords: PositionedChord[];
  repeat: number | null;
}

/**
 * Erkennt eine Akkordzeile und liefert die Akkorde mit ihrer Spalte (ohne Markup gerechnet).
 * `requireMarkup`: Wenn der Text `[ch]`-Markierungen nutzt, gelten nur markierte Wörter
 * (und N.C.) als Akkorde – sonst würde eine Textzeile wie „Em“ als Akkord gelesen.
 */
export function parseChordLine(raw: string, requireMarkup = false): ChordLineInfo | null {
  const chords: PositionedChord[] = [];
  let rendered = "";
  let last = 0;
  for (const m of raw.matchAll(CH_RE)) {
    rendered += raw.slice(last, m.index);
    chords.push({ name: m[1]!.trim(), column: rendered.length });
    rendered += m[1]!;
    last = m.index + m[0].length;
  }
  rendered += raw.slice(last);
  const marked = chords.length > 0;

  // Übrige Wörter prüfen: N.C., Wiederholungen, Taktstriche – oder (ohne Markup) Akkorde.
  let repeat: number | null = null;
  const covered = new Set(chords.map((c) => c.column));
  for (const m of rendered.matchAll(/\S+/g)) {
    if (covered.has(m.index)) continue;
    const word = m[0];
    if (marked && chords.some((c) => m.index > c.column && m.index < c.column + c.name.length)) {
      continue;
    }
    if (NC_RE.test(word)) chords.push({ name: "N.C.", column: m.index });
    else if (REPEAT_RE.test(word)) repeat = Number(REPEAT_RE.exec(word)!.slice(1).find(Boolean));
    else if (FILLER_RE.test(word)) continue;
    else if (!marked && !requireMarkup && CHORD_TOKEN_RE.test(word)) {
      chords.push({ name: word.replace(/^\(|\)$/g, ""), column: m.index });
    } else return null;
  }

  if (chords.length === 0) return null;
  chords.sort((a, b) => a.column - b.column);
  return { chords, repeat };
}

/** Setzt Akkorde anhand ihrer Spalte in die Textzeile. */
export function placeChords(lyric: string, chords: PositionedChord[]): LyricsLine {
  const text = lyric.replace(/\s+$/, "");
  const leading = text.length - text.trimStart().length;
  let leadingPause = false;

  const placed = chords.map(({ name, column }, i) => {
    let pos = column;
    if (pos < leading) {
      if (i === 0 && column === 0 && leading > 0) leadingPause = true;
      pos = leading;
    } else if (pos < text.length && /\s/.test(text[pos]!)) {
      const next = text.slice(pos).search(/\S/);
      pos = next === -1 ? text.length : pos + next;
    }
    return { name, pos: Math.min(pos, text.length) };
  });

  // Positionen sind aufsteigend (Spalten sortiert, Verschieben nur nach rechts zum nächsten Wort).
  const segments: Segment[] = [
    { chord: null, text: text.slice(leading, placed[0]?.pos ?? text.length) },
  ];
  placed.forEach(({ name, pos }, k) => {
    segments.push({ chord: name, text: text.slice(pos, placed[k + 1]?.pos ?? text.length) });
  });

  // Leerzeichen zusammenfassen; erstes Segment ohne Akkord und Text weglassen.
  const cleaned = segments
    .map((s) => ({ ...s, text: s.text.replace(/\s+/g, " ") }))
    .filter((s, i) => !(i === 0 && s.chord === null && s.text === ""));
  for (let i = 1; i < cleaned.length; i++) {
    if (cleaned[i - 1]!.text.endsWith(" ") && cleaned[i]!.text.startsWith(" ")) {
      cleaned[i]!.text = cleaned[i]!.text.slice(1);
    }
  }
  const lastSeg = cleaned.at(-1);
  if (lastSeg) lastSeg.text = lastSeg.text.trimEnd();

  return {
    kind: "lyrics",
    segments: cleaned,
    leadingPause: leadingPause && cleaned[0]?.chord !== null,
  };
}

function lyricsOnly(text: string): LyricsLine {
  return {
    kind: "lyrics",
    segments: [{ chord: null, text: text.replace(CH_RE, "$1").trim().replace(/\s+/g, " ") }],
    leadingPause: false,
  };
}

function chordsOnly(info: ChordLineInfo): ChordsLine {
  return { kind: "chords", chords: info.chords.map((c) => c.name), repeat: info.repeat };
}

/**
 * Zerlegt den UG-Rohtext in Abschnitte.
 * Text vor der ersten Überschrift wird nur übernommen, wenn er Akkorde enthält
 * (sonst sind es Titel, „Tabbed by“, Links …).
 */
export function parseUgContent(content: string): Section[] {
  const rawLines = content
    .split("\n")
    .map((l) => l.replace(/\[\/?tab\]/g, ""))
    .filter((l) => !TAB_STAFF_RE.test(l) || l.trim() === "");

  const markup = content.includes("[ch]");
  const chordLine = (l: string) => parseChordLine(l, markup);

  const sections: Section[] = [];
  let current: Section = { name: "", repeat: null, lines: [] };
  const flush = () => {
    if (current.lines.length > 0) sections.push(current);
  };

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]!;
    if (raw.trim() === "") continue;

    const header = HEADER_RE.exec(raw);
    if (header && !NOT_HEADERS.has(header[1]!.trim().toLowerCase()) && !raw.includes("[ch]")) {
      flush();
      current = {
        name: header[1]!.trim(),
        repeat: parseRepeat(header[2] ?? ""),
        lines: [],
      };
      continue;
    }

    const chordInfo = chordLine(raw);
    if (!chordInfo) {
      current.lines.push(lyricsOnly(raw));
      continue;
    }

    const next = rawLines[i + 1];
    const nextIsLyrics =
      next !== undefined &&
      next.trim() !== "" &&
      !(HEADER_RE.test(next) && !next.includes("[ch]")) &&
      chordLine(next) === null;
    if (nextIsLyrics) {
      current.lines.push(placeChords(next, chordInfo.chords));
      i++;
    } else {
      current.lines.push(chordsOnly(chordInfo));
    }
  }
  flush();

  // Vorspann ohne Akkorde verwerfen (nur wenn danach echte Abschnitte kommen).
  const first = sections[0];
  if (first && first.name === "" && sections.length > 1) {
    const hasChords = first.lines.some(
      (l: Line) => l.kind === "chords" || l.segments.some((s) => s.chord !== null),
    );
    if (!hasChords) sections.shift();
  }
  return sections;
}
