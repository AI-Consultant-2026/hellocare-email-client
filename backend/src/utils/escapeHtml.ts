// Escapes a single interpolated value before it's inserted into an HTML email body --
// used only on {{personalisation}} values pulled from an uploaded CSV, never on the
// admin's own HTML template text. This is what stops a malicious CSV cell such as
// `<img src=x onerror=...>` in a "company" column from injecting into the rendered email.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
