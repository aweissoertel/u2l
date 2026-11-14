import type { Section } from "./types.ts";

export interface ChordOptions {
  /** „Lagerfeuer-Akkorde“, siehe docs/format.md. */
  simplify?: boolean;
  /** Manuelles Ersetzen in deutscher Schreibweise; `""` = Akkord entfernen. */
  replace?: Record<string, string>;
}

const CHORD_RE = /^([A-H])(#|b)?([^/]*)(?:\/([A-H])(#|b)?)?$/;

interface ParsedChord {
  root: string;
  quality: string;
  bass: string | null;
}

function parse(chord: string): ParsedChord | null {
  const m = CHORD_RE.exec(chord);
  if (!m) return null;
  return {
    root: m[1]! + (m[2] ?? ""),
    quality: m[3] ?? "",
    bass: m[4] ? m[4] + (m[5] ?? "") : null,
  };
}

function join({ root, quality, bass }: ParsedChord): string {
  return root + quality + (bass ? `/${bass}` : "");
}

/** Lagerfeuer-Regeln für einen englischen Akkordnamen. */
export function simplifyChord(chord: string): string {
  const p = parse(chord);
  if (!p) return chord;
  let q = p.quality;
  q = q.replace(/^(m|min|mi)\(?maj7\)?$/, "m"); // mmaj7 → m
  q = q.replace(/^(maj7|M7|Δ7?)$/, ""); // maj7 → Dur
  q = q.replace(/^5$/, ""); // Powerchord → Dur
  q = q.replace(/sus[24]?/, ""); // sus2/sus4 weg (A7sus4 → A7)
  return join({ root: p.root, quality: q, bass: null });
}

function germanNote(note: string): string {
  if (note === "B") return "H";
  if (note === "Bb") return "B";
  return note;
}

/** Englisch → deutsche Schreibweise: B → H, Bb → B (auch im Bass). */
export function toGermanChord(chord: string): string {
  const p = parse(chord);
  if (!p) return chord;
  return join({
    root: germanNote(p.root),
    quality: p.quality,
    bass: p.bass ? germanNote(p.bass) : null,
  });
}

function isProcessable(chord: string): boolean {
  return chord !== "N.C.";
}

/** Schritte 2–3: vereinfachen (optional) und eindeutschen. */
export function normalizeChord(chord: string, simplify: boolean): string {
  if (!isProcessable(chord)) return chord;
  return toGermanChord(simplify ? simplifyChord(chord) : chord);
}

/** Wendet Schritte 2–5 der Akkord-Verarbeitung auf alle Abschnitte an. */
export function processChords(sections: Section[], options: ChordOptions = {}): Section[] {
  const simplify = options.simplify ?? false;
  const replace = options.replace ?? {};
  const map = (chord: string): string | null => {
    const normalized = normalizeChord(chord, simplify);
    const replaced = Object.hasOwn(replace, normalized) ? replace[normalized]!.trim() : normalized;
    return replaced === "" ? null : replaced;
  };

  return sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => {
      if (line.kind === "chords") {
        const chords = line.chords.map(map).filter((c): c is string => c !== null);
        return { ...line, chords: simplify ? dedupe(chords) : chords };
      }
      let previous: string | null = null;
      const segments = line.segments.map((seg) => {
        let chord = seg.chord === null ? null : map(seg.chord);
        if (simplify && chord !== null && chord === previous) chord = null;
        if (chord !== null) previous = chord;
        return { ...seg, chord };
      });
      return { ...line, segments, leadingPause: line.leadingPause && segments[0]?.chord != null };
    }),
  }));
}

function dedupe(chords: string[]): string[] {
  return chords.filter((c, i) => c !== chords[i - 1]);
}

/** Alle Akkorde nach Schritt 2–3 (vor dem manuellen Ersetzen), mit Anzahl – für die Oberfläche. */
export function countChords(sections: Section[], simplify: boolean): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (chord: string) => {
    const name = normalizeChord(chord, simplify);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  };
  for (const section of sections) {
    for (const line of section.lines) {
      if (line.kind === "chords") line.chords.forEach(add);
      else for (const seg of line.segments) if (seg.chord) add(seg.chord);
    }
  }
  return counts;
}

/** Akkorde, die im fertigen Lied stehen (für die Griffbilder). */
export function usedChords(sections: Section[]): Set<string> {
  const used = new Set<string>();
  for (const section of sections) {
    for (const line of section.lines) {
      if (line.kind === "chords") line.chords.forEach((c) => used.add(c));
      else for (const seg of line.segments) if (seg.chord) used.add(seg.chord);
    }
  }
  used.delete("N.C.");
  return used;
}
