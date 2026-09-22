/* eslint-disable no-console */
// Minimal console logger. Nothing passed here should ever be a password, token, or SMTP
// credential -- callers are responsible for that (see auditLog.service.ts for the
// user-facing audit trail, which is separate from this operational log).
export const logger = {
  info: (...args: unknown[]) => console.log(new Date().toISOString(), "[INFO]", ...args),
  warn: (...args: unknown[]) => console.warn(new Date().toISOString(), "[WARN]", ...args),
  error: (...args: unknown[]) => console.error(new Date().toISOString(), "[ERROR]", ...args),
};
