import { mergeHtml, mergePlainText } from "./personalize";

const fields = {
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  company: "Acme Ltd",
  extraFields: { region: "London" },
};

describe("mergePlainText", () => {
  it("substitutes built-in variables", () => {
    expect(mergePlainText("Dear {{first_name}} {{last_name}} from {{company}},", fields)).toBe(
      "Dear Jane Doe from Acme Ltd,",
    );
  });

  it("is case-insensitive and tolerant of spaces", () => {
    expect(mergePlainText("{{ First_Name }} <{{EMAIL}}>", fields)).toBe("Jane <jane@example.com>");
  });

  it("substitutes extra CSV columns", () => {
    expect(mergePlainText("Region: {{region}}", fields)).toBe("Region: London");
  });

  it("replaces an unknown or missing variable with an empty string, never leaves it broken", () => {
    expect(mergePlainText("Hi {{first_name}} ({{nonexistent}})", fields)).toBe("Hi Jane ()");
  });
});

describe("mergeHtml", () => {
  it("escapes a malicious value from the CSV before merging", () => {
    const malicious = { ...fields, company: '<img src=x onerror="alert(1)">' };
    const result = mergeHtml("<p>Company: {{company}}</p>", malicious);
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("does not escape the admin's own surrounding HTML markup", () => {
    const result = mergeHtml("<p><strong>Dear {{first_name}}</strong></p>", fields);
    expect(result).toBe("<p><strong>Dear Jane</strong></p>");
  });
});
