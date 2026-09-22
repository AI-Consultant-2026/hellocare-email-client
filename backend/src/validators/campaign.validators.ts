import { z } from "zod";
import { SENDER_ACCOUNT_KEYS } from "../config";

export const campaignIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const composeSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    fromAccountKey: z.enum(SENDER_ACCOUNT_KEYS).optional(),
    subject: z.string().min(1).max(300).optional(),
    htmlBody: z.string().min(1).max(200_000).optional(),
    textBody: z.string().min(1).max(200_000).optional(),
  }),
});

export const toggleRecipientSchema = z.object({
  params: z.object({ id: z.string().uuid(), recipientId: z.string().uuid() }),
  body: z.object({ isSelected: z.boolean() }),
});

export const removeRecipientSchema = z.object({
  params: z.object({ id: z.string().uuid(), recipientId: z.string().uuid() }),
});

export const previewSchema = z.object({
  params: z.object({ id: z.string().uuid(), recipientId: z.string().uuid() }),
});

export const sendTestEmailSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ testEmail: z.string().email() }),
});
