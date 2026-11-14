import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { convertTab, type ConvertOptions } from "./convert.ts";
import { cleanSongbookRefs } from "./latex/songbooks.ts";
import { SECTION_TYPES, type SectionType } from "./song/types.ts";
import { fetchUgTab } from "./ug/fetch.ts";
import { UgError, type UgTab } from "./ug/types.ts";
import { INDEX_HTML } from "./web/page.ts";

export interface AppDeps {
  fetchTab: (url: string) => Promise<UgTab>;
}

const MAX_BODY = 512 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Prüft die Eingabe für /api/convert. Liefert eine Fehlermeldung oder die bereinigten Daten. */
function parseConvertBody(
  body: unknown,
): { tab: Pick<UgTab, "title" | "artist" | "capo" | "content">; options: ConvertOptions } | string {
  if (!isRecord(body) || !isRecord(body.tab)) return "Es fehlt der abgerufene Song.";
  const { title, artist, capo, content } = body.tab;
  if (typeof content !== "string" || content.trim() === "") return "Der Song hat keinen Text.";
  if (typeof title !== "string" || typeof artist !== "string") return "Titel oder Interpret fehlt.";
  if (capo !== null && capo !== undefined && !(Number.isInteger(capo) && Number(capo) > 0)) {
    return "Ungültiger Capo.";
  }

  const raw = isRecord(body.options) ? body.options : {};
  const options: ConvertOptions = { simplify: raw.simplify === true };

  if (isRecord(raw.sectionTypes)) {
    const sectionTypes: Record<number, SectionType> = {};
    for (const [key, value] of Object.entries(raw.sectionTypes)) {
      const index = Number(key);
      if (Number.isInteger(index) && SECTION_TYPES.includes(value as SectionType)) {
        sectionTypes[index] = value as SectionType;
      }
    }
    options.sectionTypes = sectionTypes;
  }

  if (isRecord(raw.replace)) {
    const replace: Record<string, string> = {};
    for (const [from, to] of Object.entries(raw.replace)) {
      if (typeof to === "string" && from.length <= 20 && to.length <= 20 && !/[\\{}\]%]/.test(to)) {
        replace[from] = to;
      }
    }
    options.replace = replace;
  }

  if (isRecord(raw.songbooks)) options.songbooks = cleanSongbookRefs(raw.songbooks);

  return {
    tab: { title, artist, capo: typeof capo === "number" ? capo : null, content },
    options,
  };
}

export function createApp(deps: AppDeps = { fetchTab: (url) => fetchUgTab(url) }) {
  const app = new Hono();

  app.use(
    "/api/*",
    bodyLimit({ maxSize: MAX_BODY, onError: (c) => c.json({ error: "Anfrage zu groß." }, 413) }),
  );

  app.get("/healthz", (c) => c.text("ok"));
  app.get("/", (c) => c.html(INDEX_HTML));

  app.post("/api/ug", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const url = isRecord(body) && typeof body.url === "string" ? body.url : null;
    if (!url) return c.json({ error: "Bitte einen Link angeben." }, 400);

    try {
      return c.json(await deps.fetchTab(url));
    } catch (error) {
      if (error instanceof UgError) return c.json({ error: error.message }, error.status);
      console.error(error);
      return c.json({ error: "Unerwarteter Fehler beim Abruf." }, 500);
    }
  });

  app.post("/api/convert", async (c) => {
    const parsed = parseConvertBody(await c.req.json().catch(() => null));
    if (typeof parsed === "string") return c.json({ error: parsed }, 400);
    try {
      return c.json(convertTab(parsed.tab, parsed.options));
    } catch (error) {
      console.error(error);
      return c.json({ error: "Der Song konnte nicht umgewandelt werden." }, 500);
    }
  });

  return app;
}
