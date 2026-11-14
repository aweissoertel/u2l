import { UgError } from "./types.js";

/** Hosts, von denen das Tool abrufen darf. Alles andere wird abgelehnt (kein offener Proxy). */
const ALLOWED_HOSTS = new Set(["tabs.ultimate-guitar.com"]);

/**
 * Prüft eine vom Nutzer eingegebene UG-Adresse und gibt die bereinigte URL zurück.
 * Erlaubt sind nur https-Links auf Tab-Seiten von tabs.ultimate-guitar.com.
 */
export function parseUgUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new UgError("Bitte einen Link zu Ultimate Guitar eingeben.");
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new UgError("Das ist kein gültiger Link.");
  }

  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") {
    throw new UgError("Nur https-Links zu Ultimate Guitar werden unterstützt.");
  }
  if (!ALLOWED_HOSTS.has(url.hostname) || url.port !== "" || url.username || url.password) {
    throw new UgError("Nur Links zu tabs.ultimate-guitar.com werden unterstützt.");
  }
  if (!/^\/tab\/[^/]+\/[^/]+$/.test(url.pathname)) {
    throw new UgError(
      "Der Link zeigt nicht auf ein einzelnes Lied (erwartet: tabs.ultimate-guitar.com/tab/<interpret>/<lied>).",
    );
  }

  url.search = "";
  url.hash = "";
  return url;
}

/** Wie {@link parseUgUrl}, aber ohne Exception. */
export function isAllowedUgUrl(url: URL): boolean {
  return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) && url.port === "";
}
