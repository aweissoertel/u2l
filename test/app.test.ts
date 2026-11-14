import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { UgError, type UgTab } from "../src/ug/types.js";

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
