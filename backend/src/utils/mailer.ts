import nodemailer, { Transporter } from "nodemailer";
import { config, getSenderPassword, SENDER_ACCOUNTS, SenderAccountKey } from "../config";

export interface OutgoingMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// One transporter per sender account, built lazily and cached -- each authenticates as
// that mailbox's own real login, never as a shared account with a spoofed From header.
// There is no code path anywhere in this app that accepts an arbitrary From address; the
// only inputs are one of these three fixed keys (enforced by campaign.validators.ts's
// zod enum).
const transporters = new Map<SenderAccountKey, Transporter>();

function getTransporter(accountKey: SenderAccountKey): Transporter {
  let transporter = transporters.get(accountKey);
  if (transporter) return transporter;

  const account = SENDER_ACCOUNTS.find((a) => a.key === accountKey);
  if (!account) throw new Error(`Unknown sender account: ${accountKey}`);

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: account.email, pass: getSenderPassword(accountKey) },
    // No default timeout in nodemailer -- an unreachable/misconfigured host would
    // otherwise hang the socket forever instead of failing the send.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 15_000,
  });
  transporters.set(accountKey, transporter);
  return transporter;
}

export async function sendAs(accountKey: SenderAccountKey, message: OutgoingMessage): Promise<void> {
  const account = SENDER_ACCOUNTS.find((a) => a.key === accountKey);
  if (!account) throw new Error(`Unknown sender account: ${accountKey}`);
  const transporter = getTransporter(accountKey);
  await transporter.sendMail({
    from: `"${account.label} - HelloCare Consulting" <${account.email}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
