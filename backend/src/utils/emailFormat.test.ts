import { formatEmailHtml, looksLikeHtml, plainTextToHtml } from "./emailFormat";

describe("plainTextToHtml", () => {
  it("turns blank-line-separated text into paragraphs and single breaks into <br>", () => {
    expect(plainTextToHtml("Dear {{first_name}},\n\nThanks for your time.\nKind regards,\nKen")).toBe(
      "<p>Dear {{first_name}},</p><p>Thanks for your time.<br>Kind regards,<br>Ken</p>",
    );
  });

  it("handles Windows line endings and extra blank lines", () => {
    expect(plainTextToHtml("One\r\n\r\n\r\nTwo\r\n")).toBe("<p>One</p><p>Two</p>");
  });

  it("escapes characters that would otherwise be read as markup", () => {
    expect(plainTextToHtml("Fees < £500 & no hidden costs")).toBe("<p>Fees &lt; £500 &amp; no hidden costs</p>");
  });

  it("returns an empty string for blank input", () => {
    expect(plainTextToHtml("  \n\n ")).toBe("");
  });
});

describe("formatEmailHtml", () => {
  it("converts a plain-text draft into styled paragraphs", () => {
    const out = formatEmailHtml("Hello\n\nWorld");
    expect(out).toContain('<p style="margin:0 0 16px 0;">Hello</p>');
    expect(out).toContain('<p style="margin:0 0 16px 0;">World</p>');
    expect(out.startsWith('<div style="font-family:')).toBe(true);
  });

  it("keeps existing HTML and adds inline spacing to paragraphs and lists", () => {
    const out = formatEmailHtml("<p>Hi</p><ul><li>One</li></ul>");
    expect(out).toContain('<p style="margin:0 0 16px 0;">Hi</p>');
    expect(out).toContain('<ul style="margin:0 0 16px 0;padding-left:24px;"><li>One</li></ul>');
  });

  it("detects HTML versus plain text", () => {
    expect(looksLikeHtml("<p>x</p>")).toBe(true);
    expect(looksLikeHtml("a < b and c > d")).toBe(false);
  });
});
