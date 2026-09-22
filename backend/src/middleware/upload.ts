import multer from "multer";
import { config } from "../config";
import { isBlockedAttachmentFilename, MAX_ATTACHMENT_BYTES } from "../utils/attachments";

// Memory storage only -- the CSV buffer lives in RAM for the duration of one request,
// is parsed, and is discarded when the request ends. Nothing is ever written to disk,
// which trivially satisfies "delete temporary uploaded files when no longer required":
// there is no temporary file to delete.
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileBytes },
  fileFilter: (_req, file, cb) => {
    const isCsv = file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) return cb(new Error("Only .csv files are accepted."));
    cb(null, true);
  },
});

// Email attachments: also memory storage (the buffer is written straight into the
// campaign_attachments row and discarded from RAM at the end of the request -- see
// campaign.service.ts's addAttachment). Blocks known-executable extensions; everything
// else (PDF, Office docs, images, etc.) is accepted.
export const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES },
  fileFilter: (_req, file, cb) => {
    if (isBlockedAttachmentFilename(file.originalname)) {
      return cb(new Error("That file type isn't allowed as an email attachment."));
    }
    cb(null, true);
  },
});
