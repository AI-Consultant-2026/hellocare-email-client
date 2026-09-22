import { isValidEmail, parseClientListCsv } from "./csvParser";

function buf(text: string): Buffer {
  return Buffer.from(text, "utf-8");
}

describe("parseClientListCsv", () => {
  it("parses valid rows with all known columns", () => {
    const rows = parseClientListCsv(buf("email,first_name,last_name,company\njane@example.com,Jane,Doe,Acme\n"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "jane@example.com", firstName: "Jane", lastName: "Doe", company: "Acme" });
  });

  it("keeps extra columns for future personalisation", () => {
    const rows = parseClientListCsv(buf("email,region\njane@example.com,London\n"));
    expect(rows[0]!.extraFields).toEqual({ region: "London" });
  });

  it("skips fully blank rows silently", () => {
    const rows = parseClientListCsv(buf("email,company\njane@example.com,Acme\n,\n"));
    expect(rows).toHaveLength(1);
  });

  it("rejects a CSV with no email column", () => {
    expect(() => parseClientListCsv(buf("first_name,last_name\nJane,Doe\n"))).toThrow(/email/i);
  });

  it("rejects malformed CSV", () => {
    expect(() => parseClientListCsv(buf('email,company\n"unterminated,Acme\n'))).toThrow();
  });

  it("neutralises a formula-injection prefix in a text cell", () => {
    const rows = parseClientListCsv(buf('email,company\njane@example.com,"=SUM(A1:A9)"\n'));
    expect(rows[0]!.company.startsWith("'")).toBe(true);
  });
});

describe("isValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidEmail("jane@example.com")).toBe(true);
  });
  it.each(["", "not-an-email", "missing@domain", "@example.com", "jane example.com"])(
    "rejects %s",
    (bad) => {
      expect(isValidEmail(bad)).toBe(false);
    },
  );
});
