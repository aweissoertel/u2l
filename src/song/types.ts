/** Ein Textstück, vor dem optional ein Akkord steht (`\[chord]text`). */
export interface Segment {
  chord: string | null;
  text: string;
}

/** Zeile mit Text, Akkorde an Silben gebunden. */
export interface LyricsLine {
  kind: "lyrics";
  segments: Segment[];
  /** Akkord am Zeilenanfang vor einer Pause → `\[Am]  Text`. */
  leadingPause: boolean;
}

/** Zeile nur aus Akkorden (Intro, Solo, …) → `{\nolyrics …}`. */
export interface ChordsLine {
  kind: "chords";
  chords: string[];
  repeat: number | null;
}

export type Line = LyricsLine | ChordsLine;

export interface Section {
  /** Überschrift von UG, z. B. „Verse 1“. Leer, wenn es keine gab. */
  name: string;
  /** Wiederholung aus der Überschrift, z. B. `[Chorus] (x2)` → 2. */
  repeat: number | null;
  lines: Line[];
}

export const SECTION_TYPES = [
  "verse",
  "verse*",
  "instrumental",
  "bridge",
  "chorus",
  "omit",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
