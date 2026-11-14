import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.ts";
import type { ConvertResult } from "../src/convert.ts";
import { UgError, type UgTab } from "../src/ug/types.ts";

const TAB: UgTab = {
  url: "https://tabs.ultimate-guitar.com/tab/test/testlied-chords-1",
  title: "Testlied",
  artist: "Die Testband",
  type: "Chords",
  capo: null,
  tonality: null,
  tuning: null,
  content: "[Verse]\n…",
};

function post(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request("/api/ug", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("app", () => {
  it("liefert Startseite und Health-Check", async () => {
    const app = createApp({ fetchTab: vi.fn() });
    expect((await app.request("/healthz")).status).toBe(200);
    const index = await app.request("/");
    expect(index.headers.get("content-type")).toContain("text/html");
  });

  it("gibt den abgerufenen Song als JSON zurück", async () => {
    const fetchTab = vi.fn().mockResolvedValue(TAB);
    const res = await post(createApp({ fetchTab }), { url: TAB.url });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(TAB);
    expect(fetchTab).toHaveBeenCalledWith(TAB.url);
  });

  it.each([{}, { url: 3 }, "kein json"])("antwortet 400 bei fehlendem Link (%j)", async (body) => {
    const res = await post(createApp({ fetchTab: vi.fn() }), body);
    expect(res.status).toBe(400);
  });

  it("reicht UgError-Meldung und Status durch", async () => {
    const fetchTab = vi.fn().mockRejectedValue(new UgError("Nur Links zu …", 400));
    const res = await post(createApp({ fetchTab }), { url: "x" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Nur Links zu …" });
  });

  it("verrät bei unerwarteten Fehlern keine Details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchTab = vi.fn().mockRejectedValue(new Error("geheimer Stacktrace"));
    const res = await post(createApp({ fetchTab }), { url: "x" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("geheim");
  });
});

describe("POST /api/convert", () => {
  const app = createApp({ fetchTab: vi.fn() });
  const tab = {
    title: "Testlied",
    artist: "Die Testband",
    capo: null,
    content: "[Verse]\n[tab][ch]Am[/ch]  [ch]Bb[/ch]\nEin Testtext[/tab]\n\n[Chorus]\n[ch]C[/ch]",
  };
  const convert = (body: unknown) =>
    app.request("/api/convert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("wandelt einen Song mit Optionen um", async () => {
    const res = await convert({
      tab,
      options: { simplify: true, sectionTypes: { 1: "omit" }, replace: { B: "H" } },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ConvertResult;
    expect(data.filename).toBe("testlied.tex");
    expect(data.tex).toContain("\\beginverse\n\\[Am]Ein \\[H]Testtext\\\\\n\\endverse");
    expect(data.tex).not.toContain("nolyrics");
    expect(data.sections.map((s: { type: string }) => s.type)).toEqual(["verse", "omit"]);
  });

  it("ignoriert ungültige Optionen statt abzubrechen", async () => {
    const res = await convert({
      tab,
      options: { simplify: "ja", sectionTypes: { 0: "\\evil" }, replace: { B: "\\input{x}" } },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ConvertResult;
    expect(data.sections[0]!.type).toBe("verse");
    expect(data.tex).not.toContain("input");
  });

  it.each([
    [{}, "Es fehlt der abgerufene Song."],
    [{ tab: { ...tab, content: "" } }, "Der Song hat keinen Text."],
    [{ tab: { ...tab, title: 1 } }, "Titel oder Interpret fehlt."],
    [{ tab: { ...tab, capo: -1 } }, "Ungültiger Capo."],
  ])("antwortet 400 bei ungültigem Song (%#)", async (body, message) => {
    const res = await convert(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message });
  });

  it("lehnt zu große Anfragen ab", async () => {
    const res = await convert({ tab: { ...tab, content: "x".repeat(600 * 1024) } });
    expect(res.status).toBe(413);
  });
});
