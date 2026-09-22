import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/token.service";
import { ApiError } from "../utils/ApiError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

// Access token only, read from the Authorization header -- never from a cookie. The
// refresh token is the only thing carried in a cookie (see auth.routes.ts), which is what
// keeps CSRF out of scope for every other endpoint: a cross-site request can't attach an
// Authorization header a browser didn't put there, and the refresh cookie itself is
// SameSite=Strict + httpOnly (see cookieOptions.ts).
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized());
  }
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(ApiError.unauthorized("Your session has expired. Please log in again."));
  }
}
