import { addUnsubscribeFooter, renderUnsubscribePage, unsubscribeUrl, verifyUnsubscribe } from "./unsubscribe";

const SECRET = "test-secret";
const BASE = "https://hellocare-email-client.onrender.com/";

describe("unsubscribe links", () => {
  it("builds a signed link on the app's own origin for the lowercased address", () => {
    const url = unsubscribeUrl("Jane.Doe@Example.com ", BASE, SECRET);
    expect(url).toMatch(/^https:\/\/hellocare-email-client\.onrender\.com\/api\/unsubscribe\?e=[\w-]+&t=[\w-]{32}$/);
    const params = new URL(url).searchParams;
    expect(verifyUnsubscribe(params.get("e")!, params.get("t")!, SECRET)).toBe("jane.doe@example.com");
  });

  it("rejects a link for a different address, a wrong secret, or missing parts", () => {
    const params = new URL(unsubscribeUrl("jane@example.com", BASE, SECRET)).searchParams;
    const otherAddress = Buffer.from("someone@example.com").toString("base64url");
    expect(verifyUnsubscribe(otherAddress, params.get("t")!, SECRET)).toBeNull();
    expect(verifyUnsubscribe(params.get("e")!, params.get("t")!, "other-secret")).toBeNull();
    expect(verifyUnsubscribe(params.get("e")!, "short", SECRET)).toBeNull();
    expect(verifyUnsubscribe("", "", SECRET)).toBeNull();
    expect(verifyUnsubscribe(Buffer.from("no-at-sign").toString("base64url"), params.get("t")!, SECRET)).toBeNull();
  });
});

describe("addUnsubscribeFooter", () => {
  const url = "https://x.test/api/unsubscribe?e=abc&t=def";

  it("appends the link to both bodies and adds one-click List-Unsubscribe headers", () => {
    const out = addUnsubscribeFooter("<p>Hi Jane</p>", "Hi Jane", url);
    expect(out.html.startsWith("<p>Hi Jane</p>")).toBe(true);
    expect(out.html).toContain('<a href="https://x.test/api/unsubscribe?e=abc&amp;t=def"');
    expect(out.html).toContain(">Unsubscribe</a>");
    expect(out.text).toBe(`Hi Jane\n\n--\nYou're receiving this email from HelloCare Consulting. To stop receiving these emails, unsubscribe here: ${url}`);
    expect(out.headers).toEqual({ "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
  });
});

describe("renderUnsubscribePage", () => {
  it("confirms a valid opt-out and explains an invalid link", () => {
    expect(renderUnsubscribePage(true)).toContain("You're unsubscribed");
    expect(renderUnsubscribePage(false)).toContain("isn't valid");
    expect(renderUnsubscribePage(false)).toContain("info@hellocareconsulting.com");
  });
});
