import "dotenv/config";

// The three (and only three) mailboxes this app is ever allowed to send from. Adding a
// fourth means editing this array and deploying a new build -- deliberately not a
// database row or an admin-editable setting, so nobody can widen who mail can be sent as
// without a code change and review. Each account authenticates as ITSELF (its own SMTP
// user/password) -- there is no shared mailbox with "send as" aliasing here, so a
// request can never actually transmit as an account it doesn't hold real credentials for.
export const SENDER_ACCOUNTS = [
  {
    key: "info",
    email: "info@hellocareconsulting.com",
    label: "Info",
    passwordEnvVar: "SMTP_PASS_INFO",
  },
  {
    key: "ken",
    email: "ken.uwotu@hellocareconsulting.com",
    label: "Ken Uwotu",
    passwordEnvVar: "SMTP_PASS_KEN",
  },
  {
    key: "isabella",
    email: "Isabella.chao@hellocareconsulting.com",
    label: "Isabella Chao",
    passwordEnvVar: "SMTP_PASS_ISABELLA",
  },
] as const;

export type SenderAccountKey = (typeof SENDER_ACCOUNTS)[number]["key"];
export const SENDER_ACCOUNT_KEYS = SENDER_ACCOUNTS.map((a) => a.key) as [SenderAccountKey, ...SenderAccountKey[]];

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4100,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5174",

  jwt: {
    accessSecret: process.env.NODE_ENV === "test" ? "test-secret" : required("JWT_ACCESS_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
  },
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  // Same host for every sender account -- this is one cPanel/InMotion mail server, just
  // three separate mailbox logins on it, not three different providers.
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_SECURE ?? "true") !== "false",
  },

  rateLimit: {
    loginWindowMs: 15 * 60 * 1000,
    loginMax: 10,
    sendWindowMs: 60 * 60 * 1000,
    sendMax: 20,
  },

  upload: {
    maxFileBytes: 5 * 1024 * 1024, // 5MB
    maxRows: 5000,
  },
} as const;

export function getSenderPassword(key: SenderAccountKey): string {
  const account = SENDER_ACCOUNTS.find((a) => a.key === key);
  if (!account) throw new Error(`Unknown sender account: ${key}`);
  return process.env[account.passwordEnvVar] || "";
}
