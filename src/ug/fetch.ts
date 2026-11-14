import { extractUgTab } from "./extract.js";
import { UgError, type UgTab } from "./types.js";
import { isAllowedUgUrl, parseUgUrl } from "./url.js";

export interface FetchUgOptions {
  /** Austauschbar für Tests. */
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  /** Obergrenze für die Seitengröße (Schutz vor Riesenantworten). */
  maxBytes?: number;
}

const MAX_REDIRECTS = 3;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new UgError("Die Seite von Ultimate Guitar ist unerwartet groß.", 502);
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

/** Ruft eine UG-Tab-Seite ab und liest den Song daraus. */
export async function fetchUgTab(input: string, options: FetchUgOptions = {}): Promise<UgTab> {
  const { fetch = globalThis.fetch, timeoutMs = 15_000, maxBytes = 5 * 1024 * 1024 } = options;
  const url = parseUgUrl(input);

  const signal = AbortSignal.timeout(timeoutMs);
  let target = url;
  let response: Response | undefined;

  // Weiterleitungen von Hand folgen, damit jede Zwischenadresse geprüft wird
  // (sonst könnte eine Weiterleitung den Server auf interne Adressen lenken).
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      response = await fetch(target, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "de,en;q=0.8",
        },
        redirect: "manual",
        signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new UgError("Ultimate Guitar antwortet nicht (Zeitüberschreitung).", 504);
      }
      throw new UgError("Ultimate Guitar ist gerade nicht erreichbar.", 502);
    }

    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) break;

    const next = new URL(location, target);
    if (!isAllowedUgUrl(next)) {
      throw new UgError("Ultimate Guitar hat auf eine unerwartete Adresse weitergeleitet.", 502);
    }
    if (hop === MAX_REDIRECTS) {
      throw new UgError("Zu viele Weiterleitungen bei Ultimate Guitar.", 502);
    }
    target = next;
  }

  if (!response) throw new UgError("Ultimate Guitar ist gerade nicht erreichbar.", 502);
  if (response.status === 404) {
    throw new UgError("Dieses Lied gibt es auf Ultimate Guitar nicht (mehr).", 422);
  }
  if (response.status === 403 || response.status === 429) {
    throw new UgError(
      "Ultimate Guitar blockiert den Abruf gerade. Später nochmal versuchen oder den Text einfügen.",
      502,
    );
  }
  if (!response.ok) {
    throw new UgError(`Ultimate Guitar antwortet mit Fehler ${response.status}.`, 502);
  }

  const html = await readLimited(response, maxBytes);
  return extractUgTab(html, target.toString());
}
