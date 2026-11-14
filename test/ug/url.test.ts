import { describe, expect, it } from "vitest";
import { parseUgUrl } from "../../src/ug/url.ts";
import { UgError } from "../../src/ug/types.ts";

describe("parseUgUrl", () => {
  it("akzeptiert Tab-Links und entfernt Query und Anker", () => {
    expect(
      parseUgUrl(" https://tabs.ultimate-guitar.com/tab/pur/abenteuerland-chords-346484?foo=1#x ")
        .href,
    ).toBe("https://tabs.ultimate-guitar.com/tab/pur/abenteuerland-chords-346484");
  });

  it("ergänzt fehlendes Schema und macht aus http https", () => {
    expect(parseUgUrl("tabs.ultimate-guitar.com/tab/a/b-chords-1").protocol).toBe("https:");
    expect(parseUgUrl("http://tabs.ultimate-guitar.com/tab/a/b-chords-1").protocol).toBe("https:");
  });

  it.each([
    ["", "Bitte einen Link"],
    ["https://example.com/tab/a/b", "Nur Links zu tabs.ultimate-guitar.com"],
    ["https://tabs.ultimate-guitar.com.evil.com/tab/a/b", "Nur Links zu tabs.ultimate-guitar.com"],
    ["https://user@tabs.ultimate-guitar.com/tab/a/b", "Nur Links zu tabs.ultimate-guitar.com"],
    ["https://tabs.ultimate-guitar.com:8443/tab/a/b", "Nur Links zu tabs.ultimate-guitar.com"],
    ["ftp://tabs.ultimate-guitar.com/tab/a/b", "Nur https-Links"],
    ["https://tabs.ultimate-guitar.com/artist/pur", "nicht auf ein einzelnes Lied"],
    ["https://tabs.ultimate-guitar.com/tab/a/b/c", "nicht auf ein einzelnes Lied"],
  ])("lehnt %j ab", (input, message) => {
    expect(() => parseUgUrl(input)).toThrow(UgError);
    expect(() => parseUgUrl(input)).toThrow(message);
  });
});
