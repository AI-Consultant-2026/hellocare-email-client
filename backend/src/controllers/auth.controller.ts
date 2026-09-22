import { Request, Response } from "express";
import { User } from "../models";
import * as authService from "../services/auth.service";
import { revokeRefreshToken, rotateRefreshToken, findValidRefreshToken, generateAccessToken } from "../services/token.service";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../utils/cookieOptions";

function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password, req.ip ?? null);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.json({ accessToken, user: publicUser(user) });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const existingToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!existingToken) throw ApiError.unauthorized("Please log in again.");

  const tokenRow = await findValidRefreshToken(existingToken);
  if (!tokenRow) throw ApiError.unauthorized("Your session has expired. Please log in again.");

  const user = await User.findByPk(tokenRow.userId);
  if (!user || !user.isActive) throw ApiError.unauthorized("Please log in again.");

  const newRefreshToken = await rotateRefreshToken(existingToken, user.id);
  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions());
  res.json({ accessToken: generateAccessToken(user), user: publicUser(user) });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const existingToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (existingToken) await revokeRefreshToken(existingToken);
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  res.status(204).end();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) throw ApiError.unauthorized();
  res.json({ user: publicUser(user) });
});
