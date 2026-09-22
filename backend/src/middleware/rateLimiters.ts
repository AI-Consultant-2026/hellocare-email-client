import rateLimit from "express-rate-limit";
import { config } from "../config";

export const loginRateLimiter = rateLimit({
  windowMs: config.rateLimit.loginWindowMs,
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
});

// Applies to confirm-send and test-send -- the two endpoints that actually transmit
// mail, not to routine draft edits/uploads.
export const sendRateLimiter = rateLimit({
  windowMs: config.rateLimit.sendWindowMs,
  max: config.rateLimit.sendMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many send attempts. Please wait before sending again." },
});
