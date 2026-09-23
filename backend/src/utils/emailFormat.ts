import { escapeHtml } from "./escapeHtml";

// True when the body already contains real markup rather than plain text with line breaks.
export function looksLikeHtml(value: string): boolean {
  return /<\/?(p|div|br|ul|ol|li|h[1-6]|table|strong|em|b|i|u|a|blockquote)\b/i.test(value);
}

// Plain text → paragraphs: a blank line starts a new <p>, a single line break becomes <br>.
export function plainTextToHtml(text: string): string {
  const normalised = text.replace(/\r\n?/g, "\n").trim();
  if (!normalised) return "";
  return normalised
    .split(/\n\s*\n/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const P_STYLE = "margin:0 0 16px 0;";
const LIST_STYLE = "margin:0 0 16px 0;padding-left:24px;";
const WRAPPER_STYLE = "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1B2231;";

// Turns the saved body into the HTML actually sent. Older drafts stored as raw pasted
// text (no tags) would otherwise arrive as one run-on block, because HTML ignores line
// breaks. Most email clients drop <style> blocks, so paragraph/list spacing goes inline.
export function formatEmailHtml(body: string): string {
  const html = looksLikeHtml(body) ? body : plainTextToHtml(body);
  const styled = html
    .replace(/<p>/gi, `<p style="${P_STYLE}">`)
    .replace(/<(ul|ol)>/gi, `<$1 style="${LIST_STYLE}">`);
  return `<div style="${WRAPPER_STYLE}">${styled}</div>`;
}
