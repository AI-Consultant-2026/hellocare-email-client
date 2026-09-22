import { parse } from "csv-parse/sync";
import { config } from "../config";
import { ApiError } from "./ApiError";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KNOWN_COLUMNS = ["email", "first_name", "last_name", "company"] as const;

export interface ParsedRow {
  rowNumber: number;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  extraFields: Record<string, string>;
}

// Cheap spreadsheet-injection guard: if a cell is ever reopened in Excel/Sheets (e.g. a
// future export feature), a value starting with =, +, -, or @ can execute as a formula.
// Nothing here re-exports data today, but storing it neutralised is free insurance.
function neutralizeFormulaPrefix(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseClientListCsv(buffer: Buffer): ParsedRow[] {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: (headerRow: string[]) => headerRow.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw ApiError.badRequest(
      `This file could not be read as CSV. ${err instanceof Error ? err.message : "It may be malformed."}`,
    );
  }

  if (records.length === 0) {
    throw ApiError.badRequest("The CSV has no data rows.");
  }

  const headers = Object.keys(records[0]!);
  if (!headers.includes("email")) {
    throw ApiError.badRequest('The CSV is missing a required "email" column.');
  }

  const rows: ParsedRow[] = [];
  records.forEach((record, index) => {
    const values = Object.values(record).map((v) => (v ?? "").trim());
    const isBlankRow = values.every((v) => v === "");
    if (isBlankRow) return; // skip blank rows silently, per spec

    if (rows.length >= config.upload.maxRows) {
      throw ApiError.badRequest(
        `This CSV has more than ${config.upload.maxRows} rows. Split it into smaller files and upload them as separate campaigns.`,
      );
    }

    const extraFields: Record<string, string> = {};
    for (const header of headers) {
      if (!(KNOWN_COLUMNS as readonly string[]).includes(header)) {
        extraFields[header] = neutralizeFormulaPrefix((record[header] ?? "").trim());
      }
    }

    rows.push({
      rowNumber: index + 2, // +2: 1-indexed, plus the header row
      email: (record.email ?? "").trim(),
      firstName: neutralizeFormulaPrefix((record.first_name ?? "").trim()),
      lastName: neutralizeFormulaPrefix((record.last_name ?? "").trim()),
      company: neutralizeFormulaPrefix((record.company ?? "").trim()),
      extraFields,
    });
  });

  return rows;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
