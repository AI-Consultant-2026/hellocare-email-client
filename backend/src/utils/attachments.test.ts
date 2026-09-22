import { isBlockedAttachmentFilename, toNodemailerAttachments } from "./attachments";

describe("isBlockedAttachmentFilename", () => {
  it.each(["invoice.exe", "READ_ME.BAT", "installer.msi", "script.js", "payload.jar"])(
    "blocks %s",
    (name) => {
      expect(isBlockedAttachmentFilename(name)).toBe(true);
    },
  );

  it.each(["report.pdf", "photo.jpg", "letter.docx", "sheet.xlsx", "notes.txt"])(
    "allows %s",
    (name) => {
      expect(isBlockedAttachmentFilename(name)).toBe(false);
    },
  );
});

describe("toNodemailerAttachments", () => {
  it("maps DB attachment rows to the shape nodemailer expects", () => {
    const rows = [{ filename: "brochure.pdf", mimeType: "application/pdf", data: Buffer.from("fake-pdf-bytes") }];
    expect(toNodemailerAttachments(rows)).toEqual([
      { filename: "brochure.pdf", content: Buffer.from("fake-pdf-bytes"), contentType: "application/pdf" },
    ]);
  });

  it("returns an empty array for a campaign with no attachments", () => {
    expect(toNodemailerAttachments([])).toEqual([]);
  });
});
