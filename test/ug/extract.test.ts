import { describe, expect, it } from "vitest";
import { decodeHtmlAttribute, extractUgTab } from "../../src/ug/extract.ts";
import { UgError } from "../../src/ug/types.ts";
import { buildUgHtml, sampleStore } from "../helpers/ug-html.ts";

const URL = "https://tabs.ultimate-guitar.com/tab/test/testlied-chords-1";

describe("decodeHtmlAttribute", () => {
  it("dekodiert benannte und numerische Entities", () => {
    expect(decodeHtmlAttribute("&quot;a&quot; &amp; &#039;b&#39; &#x41;&lt;&gt;")).toBe(
      "\"a\" & 'b' A<>",
    );
  });

  it("lässt Unbekanntes stehen", () => {
    expect(decodeHtmlAttribute("&foo; & &#xZZ;")).toBe("&foo; & &#xZZ;");
  });
});

describe("extractUgTab", () => {
  it("liest Metadaten und normalisierten Inhalt", () => {
    const tab = extractUgTab(buildUgHtml(sampleStore()), URL);
    expect(tab).toMatchObject({
      url: URL,
      title: "Testlied",
      artist: "Die Testband",
      type: "Chords",
      capo: 2,
      tonality: "Am",
      tuning: "E A D G B E",
    });
    expect(tab.content).not.toContain("\r");
    expect(tab.content).toContain('Ein erfundener Text <mit> & "Zeichen"[/tab]');
    expect(tab.content).toContain("[Verse 1]\n[tab][ch]Am[/ch]");
  });

  it("akzeptiert Capo als String und ignoriert Capo 0", () => {
    expect(extractUgTab(buildUgHtml(sampleStore({ meta: { capo: "3" } })), URL).capo).toBe(3);
    expect(extractUgTab(buildUgHtml(sampleStore({ meta: { capo: 0 } })), URL).capo).toBeNull();
  });

  it("nimmt die Tonart aus tonality_name, wenn meta keine hat", () => {
    const html = buildUgHtml(
      sampleStore({ meta: { tonality: undefined }, tab: { tonality_name: "C" } }),
    );
    expect(extractUgTab(html, URL).tonality).toBe("C");
  });

  it("meldet fehlende Songdaten", () => {
    expect(() => extractUgTab("<html></html>", URL)).toThrow("keine Songdaten");
  });

  it("meldet kaputtes JSON", () => {
    expect(() => extractUgTab('<div class="js-store" data-content="{nope"></div>', URL)).toThrow(
      "nicht gelesen",
    );
  });

  it("lehnt andere Typen als Chords ab", () => {
    const html = buildUgHtml(sampleStore({ tab: { type: "Tabs" } }));
    expect(() => extractUgTab(html, URL)).toThrow(UgError);
    expect(() => extractUgTab(html, URL)).toThrow("„Tabs“");
  });

  it("meldet Seiten ohne Liedtext (z. B. Pro-Versionen)", () => {
    const html = buildUgHtml(sampleStore({ content: "" }));
    expect(() => extractUgTab(html, URL)).toThrow("kein Liedtext");
  });
});
