import { describe, expect, it, vi } from "vitest";
import { fetchUgTab } from "../../src/ug/fetch.ts";
import { buildUgHtml, sampleStore } from "../helpers/ug-html.ts";

const URL = "https://tabs.ultimate-guitar.com/tab/test/testlied-chords-1";

function mockFetch(...responses: Response[]) {
  const fn = vi.fn<typeof fetch>();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  return fn;
}

describe("fetchUgTab", () => {
  it("ruft die Seite ab und liest den Song", async () => {
    const fetch = mockFetch(new Response(buildUgHtml(sampleStore()), { status: 200 }));
    const tab = await fetchUgTab(URL, { fetch });
    expect(tab.title).toBe("Testlied");
    expect(fetch).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetch.mock.calls[0]!;
    expect(String(calledUrl)).toBe(URL);
    expect(init?.redirect).toBe("manual");
  });

  it("ruft für ungültige Links gar nicht erst ab", async () => {
    const fetch = mockFetch();
    await expect(fetchUgTab("https://example.com/tab/a/b", { fetch })).rejects.toThrow("Nur Links");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("folgt Weiterleitungen innerhalb von UG", async () => {
    const fetch = mockFetch(
      new Response(null, { status: 301, headers: { location: "/tab/test/neu-chords-2" } }),
      new Response(buildUgHtml(sampleStore()), { status: 200 }),
    );
    const tab = await fetchUgTab(URL, { fetch });
    expect(tab.url).toBe("https://tabs.ultimate-guitar.com/tab/test/neu-chords-2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("folgt keinen Weiterleitungen auf fremde Hosts", async () => {
    const fetch = mockFetch(
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } }),
    );
    await expect(fetchUgTab(URL, { fetch })).rejects.toThrow("unerwartete Adresse");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("bricht Weiterleitungsschleifen ab", async () => {
    const redirect = () =>
      new Response(null, { status: 302, headers: { location: "/tab/a/b-chords-1" } });
    const fetch = mockFetch(redirect(), redirect(), redirect(), redirect(), redirect());
    await expect(fetchUgTab(URL, { fetch })).rejects.toThrow("Zu viele Weiterleitungen");
  });

  it.each([
    [404, "gibt es auf Ultimate Guitar nicht"],
    [403, "blockiert"],
    [429, "blockiert"],
    [500, "Fehler 500"],
  ])("übersetzt HTTP %i in eine verständliche Meldung", async (status, message) => {
    const fetch = mockFetch(new Response("", { status }));
    await expect(fetchUgTab(URL, { fetch })).rejects.toThrow(message);
  });

  it("meldet Netzwerkfehler und Zeitüberschreitung", async () => {
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchUgTab(URL, { fetch: offline })).rejects.toThrow("nicht erreichbar");

    const timeout = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(fetchUgTab(URL, { fetch: timeout })).rejects.toThrow("Zeitüberschreitung");
  });

  it("begrenzt die Seitengröße", async () => {
    const fetch = mockFetch(new Response("x".repeat(2000), { status: 200 }));
    await expect(fetchUgTab(URL, { fetch, maxBytes: 1000 })).rejects.toThrow("unerwartet groß");
  });
});
