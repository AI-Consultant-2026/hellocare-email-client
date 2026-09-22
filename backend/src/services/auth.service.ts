import bcrypt from "bcryptjs";
import { User } from "../models";
import { ApiError } from "../utils/ApiError";
import { recordAudit } from "./auditLog.service";
import { generateAccessToken, issueRefreshToken } from "./token.service";

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Deliberately vague on failure ("Invalid email or password") whether the account exists,
// is inactive, or the password is wrong -- distinguishing those to the caller would let
// an attacker enumerate valid usernames.
export async function login(email: string, password: string, ipAddress: string | null): Promise<AuthResult> {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  const genericError = ApiError.unauthorized("Invalid email or password.");

  if (!user || !user.isActive) {
    await recordAudit("login_failed", null, { email }, ipAddress);
    throw genericError;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    await recordAudit("login_failed", user.id, { email }, ipAddress);
    throw genericError;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  await recordAudit("login_success", user.id, { email }, ipAddress);
  return { user, accessToken, refreshToken };
}
