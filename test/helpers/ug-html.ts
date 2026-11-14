/**
 * Baut eine minimale UG-Tab-Seite wie die echte: JSON, HTML-kodiert in `data-content`.
 * Alle Testdaten im Repo sind erfunden – echte UG-Seiten liegen nur lokal in examples/ug/.
 */
export function buildUgHtml(store: unknown): string {
  const encoded = JSON.stringify(store)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#039;");
  return `<!DOCTYPE html><html><head><title>x</title></head><body>
<div class="js-store" data-content="${encoded}"></div>
</body></html>`;
}

export const SAMPLE_CONTENT = [
  "Testlied",
  "Die Testband",
  "",
  "[Intro]",
  "[ch]Am[/ch]  [ch]C[/ch]  | [ch]G[/ch] |",
  "",
  "[Verse 1]",
  "[tab][ch]Am[/ch]            [ch]C[/ch]",
  '  Ein erfundener Tеxt <mit> & "Zeichen"[/tab]',
].join("\r\n");

export function sampleStore(overrides: { tab?: object; meta?: object; content?: string } = {}) {
  return {
    store: {
      page: {
        data: {
          tab: {
            song_name: "Testlied",
            artist_name: "Die Testband",
            type: "Chords",
            tonality_name: "",
            ...overrides.tab,
          },
          tab_view: {
            meta: { capo: 2, tonality: "Am", tuning: { value: "E A D G B E" }, ...overrides.meta },
            wiki_tab: { content: overrides.content ?? SAMPLE_CONTENT },
          },
        },
      },
    },
  };
}
