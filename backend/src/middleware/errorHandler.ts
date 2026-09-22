import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

// Last middleware in the chain (see app.ts). A recognised ApiError's message is safe to
// show verbatim (every throw site wrote it for the user); a multer upload error (bad
// file type, too large) also has a safe, specific message; anything else is a genuine
// bug -- logged with its full stack server-side, answered with a generic message so no
// stack trace, SQL text, or file path ever reaches the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const isAttachment = req.path.includes("/attachments");
      return res.status(400).json({ error: isAttachment ? "That file is too large (10MB limit)." : "That file is too large (5MB limit)." });
    }
    return res.status(400).json({ error: "That file could not be uploaded." });
  }
  // fileFilter callbacks in middleware/upload.ts pass a plain Error with a specific,
  // already-user-safe message (not a stack trace or internal detail) -- surfaced as-is.
  if (err instanceof Error && (err.message === "Only .csv files are accepted." || err.message === "That file type isn't allowed as an email attachment.")) {
    return res.status(400).json({ error: err.message });
  }
  logger.error("Unhandled error", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
