import { CampaignAttachment } from "../models";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB per file
export const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB per campaign -- most
// mail servers (including cPanel/InMotion's) reject a message much past ~25MB once the
// body and MIME/base64 overhead are added, so this leaves headroom rather than accepting
// files that would just bounce at send time.

// Attachments are sent as-is to every recipient -- executable file types are blocked
// outright (the same class of extension most mail providers already refuse), matching
// this app's existing "protection against malicious content" posture for CSV uploads.
// This is a denylist, not an allowlist: ordinary business documents (PDF, Office, images,
// etc.) are never blocked by extension.
const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".scr", ".msi", ".js", ".jse", ".vbs", ".vbe",
  ".ps1", ".psm1", ".jar", ".sh", ".app", ".dmg", ".pkg", ".apk", ".wsf", ".hta",
];

export function isBlockedAttachmentFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export interface NodemailerAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

// Pure mapping, kept separate from any DB/network call so it's directly unit-testable.
export function toNodemailerAttachments(
  attachments: Pick<CampaignAttachment, "filename" | "mimeType" | "data">[],
): NodemailerAttachment[] {
  return attachments.map((a) => ({ filename: a.filename, content: a.data, contentType: a.mimeType }));
}
