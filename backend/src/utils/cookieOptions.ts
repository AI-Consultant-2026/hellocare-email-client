import { CookieOptions } from "express";
import { config } from "../config";

export const REFRESH_COOKIE_NAME = "hcc_refresh";

// SameSite=Strict + httpOnly + Secure (in production) is the entire CSRF defence for
// this app: the refresh cookie is the only credential ever carried in a cookie, and
// Strict means it isn't even sent on a top-level cross-site navigation, let alone a
// cross-site fetch/form POST. Every other endpoint reads the access token from an
// Authorization header instead, which a cross-site request can't attach at all.
export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: config.jwt.refreshExpiresInMs,
  };
}
