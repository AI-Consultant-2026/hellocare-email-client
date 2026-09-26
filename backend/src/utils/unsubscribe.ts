import crypto from "crypto";

// Signed unsubscribe links for campaign emails (2026-09-26). The link carries the
// (base64url) address and an HMAC of it, so it keeps working after the campaign that sent
// it is deleted, and nobody can unsubscribe an address they weren't sent. Pure functions:
// the secret and base URL are passed in, which keeps them unit-testable.

function sign(email: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`unsubscribe:${email}`).digest("base64url").slice(0, 32);
}

export function unsubscribeUrl(email: string, baseUrl: string, secret: string): string {
  const normalized = email.trim().toLowerCase();
  const e = Buffer.from(normalized, "utf8").toString("base64url");
  return `${baseUrl.replace(/\/$/, "")}/api/unsubscribe?e=${e}&t=${sign(normalized, secret)}`;
}

// Returns the lowercased address for a genuine link, or null for anything tampered with.
export function verifyUnsubscribe(encoded: string, token: string, secret: string): string | null {
  if (!encoded || !token) return null;
  const email = Buffer.from(encoded, "base64url").toString("utf8").trim().toLowerCase();
  if (!email.includes("@")) return null;
  const expected = Buffer.from(sign(email, secret));
  const given = Buffer.from(token);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  return email;
}

export interface WithFooter {
  html: string;
  text: string;
  headers: Record<string, string>;
}

// Appends the unsubscribe footer to both bodies and returns the List-Unsubscribe headers
// that let mail apps (Gmail, Outlook, Apple Mail) show their own unsubscribe button.
export function addUnsubscribeFooter(html: string, text: string, url: string): WithFooter {
  const safeUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const footerHtml =
    `<p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">` +
    `You're receiving this email from HelloCare Consulting. <a href="${safeUrl}" style="color:#6b7280;">Unsubscribe</a></p>`;
  return {
    html: `${html}\n${footerHtml}`,
    text: `${text}\n\n--\nYou're receiving this email from HelloCare Consulting. To stop receiving these emails, unsubscribe here: ${url}`,
    headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

export function renderUnsubscribePage(ok: boolean): string {
  const title = ok ? "You're unsubscribed" : "This unsubscribe link isn't valid";
  const body = ok
    ? "You won't receive any more emails like this from HelloCare Consulting."
    : 'The link may be incomplete. To stop our emails, reply to any of them with "unsubscribe", or email info@hellocareconsulting.com.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | HelloCare Consulting</title></head><body style="margin:0;background:#F6F2E9;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#141B2C"><main style="max-width:560px;margin:12vh auto;padding:0 24px"><p style="letter-spacing:.12em;text-transform:uppercase;font-size:13px;color:#A0762F;font-weight:600">HelloCare Consulting</p><h1 style="font-size:28px;margin:8px 0 12px">${title}</h1><p style="line-height:1.6">${body}</p><p><a href="https://hellocareconsulting.com/" style="color:#A0762F;font-weight:600">Go to hellocareconsulting.com</a></p></main></body></html>`;
}
