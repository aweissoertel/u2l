import type { Section, SectionType } from "./types.ts";

const RULES: [RegExp, SectionType][] = [
  [/^(verse|strophe|vers|couplet)\b/, "verse"],
  [/^(pre[- ]?chorus|pre[- ]?refrain|bridge|build|drop|middle ?8)\b/, "bridge"],
  [/^(chorus|refrain|post[- ]?chorus|hook)\b/, "chorus"],
];

/** Best Guess, welcher LaTeX-Abschnitt zu einem UG-Abschnitt passt (docs/format.md, Abschnitt 4). */
export function guessSectionType(section: Section): SectionType {
  if (section.lines.every((l) => l.kind === "chords")) return "instrumental";
  const name = section.name.trim().toLowerCase();
  for (const [re, type] of RULES) if (re.test(name)) return type;
  return "verse*";
}
