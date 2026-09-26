export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type SenderAccountKey = "info" | "ken" | "isabella";

export interface SenderAccount {
  key: SenderAccountKey;
  email: string;
  label: string;
}

export type CampaignStatus = "draft" | "sending" | "completed";
export type RecipientStatus =
  | "pending"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "skipped"
  | "invalid"
  | "duplicate"
  | "unsubscribed";

export interface Campaign {
  id: string;
  originalFilename: string;
  fromAccountKey: SenderAccountKey | null;
  subject: string | null;
  htmlBody: string | null;
  textBody: string | null;
  status: CampaignStatus;
  totalRecipients: number;
  validRecipients: number;
  invalidRecipients: number;
  duplicateRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  creator?: { name: string; email: string };
  recipients?: CampaignRecipient[];
  attachments?: CampaignAttachment[];
}

export interface CampaignAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CampaignRecipient {
  id: string;
  rowNumber: number;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  extraFields: Record<string, string>;
  status: RecipientStatus;
  isSelected: boolean;
  validationErrors: string[];
  errorMessage: string | null;
  sentAt: string | null;
}

export interface UploadSummary {
  campaignId: string;
  totalRecords: number;
  validRecipients: number;
  invalidRecipients: number;
  duplicateRecipients: number;
  willReceive: number;
}
