import { normalizeUgText } from "./normalize.ts";
import { UgError, type UgTab } from "./types.ts";

const STORE_RE = /<div[^>]*\bclass="js-store"[^>]*\bdata-content="([^"]*)"/;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

/** Dekodiert HTML-Entities in einem Attributwert. */
export function decodeHtmlAttribute(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** UG liefert den Capo mal als Zahl, mal als String. */
function parseCapo(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 && n < 20 ? n : null;
}

/**
 * Liest den Song aus dem HTML einer UG-Tab-Seite.
 * UG legt alle Daten als HTML-kodiertes JSON in `<div class="js-store" data-content="…">`.
 */
export function extractUgTab(html: string, url: string): UgTab {
  const match = STORE_RE.exec(html);
  if (!match?.[1]) {
    throw new UgError(
      "Auf der Seite wurden keine Songdaten gefunden – hat Ultimate Guitar das Seitenformat geändert?",
      502,
    );
  }

  let store: unknown;
  try {
    store = JSON.parse(decodeHtmlAttribute(match[1]));
  } catch {
    throw new UgError("Die Songdaten auf der Seite konnten nicht gelesen werden.", 502);
  }

  const data =
    isRecord(store) && isRecord(store.store) && isRecord(store.store.page)
      ? store.store.page.data
      : undefined;
  const tab = isRecord(data) ? data.tab : undefined;
  const tabView = isRecord(data) ? data.tab_view : undefined;
  const wikiTab = isRecord(tabView) ? tabView.wiki_tab : undefined;
  const content = isRecord(wikiTab) ? str(wikiTab.content) : null;

  if (!isRecord(tab) || !content) {
    throw new UgError(
      "Auf der Seite wurde kein Liedtext gefunden. Ist es eine normale Akkord-Seite (keine Pro/Official-Version)?",
      422,
    );
  }

  const type = str(tab.type) ?? "";
  if (type !== "Chords") {
    throw new UgError(
      `Nur Akkord-Seiten („Chords“) werden unterstützt, dieser Link ist vom Typ „${type || "unbekannt"}“.`,
      422,
    );
  }

  const meta = isRecord(tabView) && isRecord(tabView.meta) ? tabView.meta : {};
  const tuning = isRecord(meta.tuning) ? str(meta.tuning.value) : null;

  return {
    url,
    title: normalizeUgText(str(tab.song_name) ?? "Unbekannter Titel"),
    artist: normalizeUgText(str(tab.artist_name) ?? ""),
    type,
    capo: parseCapo(meta.capo),
    tonality: str(meta.tonality) ?? str(tab.tonality_name),
    tuning,
    content: normalizeUgText(content),
  };
}
