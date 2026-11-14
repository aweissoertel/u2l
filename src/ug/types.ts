/** Ein Song, wie er von einer Ultimate-Guitar-Seite gelesen wurde (noch unverarbeitet). */
export interface UgTab {
  /** Die abgerufene (geprüfte) URL. */
  url: string;
  title: string;
  artist: string;
  /** UG-Typ, z. B. "Chords". */
  type: string;
  /** Capo-Bund, `null` wenn UG keinen angibt. */
  capo: number | null;
  /** Tonart laut UG, z. B. "Am". */
  tonality: string | null;
  /** Stimmung laut UG, z. B. "E A D G B E". */
  tuning: string | null;
  /** Rohtext mit UG-Markup (`[Verse]`, `[tab]…[/tab]`, `[ch]…[/ch]`), bereits normalisiert. */
  content: string;
}

/** Fehler, deren Nachricht direkt in der Weboberfläche angezeigt werden darf. */
export class UgError extends Error {
  constructor(
    message: string,
    /** HTTP-Status, den der Server dafür zurückgibt. */
    readonly status: 400 | 422 | 502 | 504 = 400,
  ) {
    super(message);
    this.name = "UgError";
  }
}
