import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { RefreshToken, User } from "../models";

export function generateAccessToken(user: User): string {
  // The installed @types/jsonwebtoken types `expiresIn` as a template-literal-branded
  // string, not a plain `string` -- config.jwt.accessExpiresIn is read from an env var,
  // so it's genuinely just `string` at the type level even though the runtime value
  // ("15m") is valid. The cast is safe: jsonwebtoken parses it with the same `ms()`
  // library either way.
  const options: jwt.SignOptions = { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign({ sub: user.id, email: user.email }, config.jwt.accessSecret, options);
}

export function verifyAccessToken(token: string): { sub: string; email: string } {
  return jwt.verify(token, config.jwt.accessSecret) as { sub: string; email: string };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// The refresh token itself (a random opaque string, not a JWT -- it carries no data, so
// there's nothing to forge even if the hash were somehow reversed) is only ever returned
// to the caller once, to set as an httpOnly cookie. Only its hash is persisted.
export async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("hex");
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + config.jwt.refreshExpiresInMs),
  });
  return token;
}

export async function findValidRefreshToken(token: string): Promise<RefreshToken | null> {
  const row = await RefreshToken.findOne({ where: { tokenHash: hashToken(token) } });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const row = await RefreshToken.findOne({ where: { tokenHash: hashToken(token) } });
  if (row && !row.revokedAt) {
    row.revokedAt = new Date();
    await row.save();
  }
}

// Rotation: the old token is revoked and a new one issued in the same call, so a stolen
// refresh token that gets reused after the legitimate client already rotated it is a
// detectable, dead token rather than a silently-still-valid one.
export async function rotateRefreshToken(oldToken: string, userId: string): Promise<string> {
  await revokeRefreshToken(oldToken);
  return issueRefreshToken(userId);
}
