import { Op } from "sequelize";
import { config } from "../config";
import { EmailUnsubscribe } from "../models";
import { unsubscribeUrl, verifyUnsubscribe } from "../utils/unsubscribe";

// Links point at this app's own public origin (the same origin serves the API in
// production -- see app.ts), signed with the JWT secret like the rest of the app's tokens.
export function unsubscribeUrlFor(email: string): string {
  return unsubscribeUrl(email, config.corsOrigin, config.jwt.accessSecret);
}

export async function unsubscribe(encoded: string, token: string): Promise<boolean> {
  const email = verifyUnsubscribe(encoded, token, config.jwt.accessSecret);
  if (!email) return false;
  await EmailUnsubscribe.findOrCreate({ where: { email }, defaults: { email } });
  return true;
}

// The lowercased addresses from `emails` that have opted out.
export async function findUnsubscribed(emails: string[]): Promise<Set<string>> {
  const wanted = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  if (wanted.length === 0) return new Set();
  const rows = await EmailUnsubscribe.findAll({ where: { email: { [Op.in]: wanted } }, attributes: ["email"] });
  return new Set(rows.map((r) => r.email));
}
