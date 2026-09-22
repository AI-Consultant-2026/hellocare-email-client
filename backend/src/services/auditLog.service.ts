import { AuditLog } from "../models";
import { logger } from "../utils/logger";

// Fire-and-forget by design: a logging failure must never block or fail the real action
// (a login, an upload, a send) that triggered it. `details` must never contain a
// password, token, or SMTP credential -- every call site below is a fixed, reviewed
// shape, never a raw pass-through of request body/headers.
export async function recordAudit(
  action: string,
  userId: string | null,
  details: Record<string, unknown> = {},
  ipAddress: string | null = null,
): Promise<void> {
  try {
    await AuditLog.create({ action, userId, details, ipAddress });
  } catch (err) {
    logger.error("Failed to write audit log", action, err);
  }
}
