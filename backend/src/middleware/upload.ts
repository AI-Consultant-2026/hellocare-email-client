import multer from "multer";
import { config } from "../config";

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
