import { Op } from "sequelize";
import { SenderAccountKey } from "../config";
import { Campaign, CampaignAttachment, CampaignRecipient, User } from "../models";
import { ApiError } from "../utils/ApiError";
import { isValidEmail, parseClientListCsv } from "../utils/csvParser";
import { formatEmailHtml } from "../utils/emailFormat";
import { mergeHtml, mergePlainText, PersonalizationFields } from "../utils/personalize";
import { sendAs } from "../utils/mailer";
import { MAX_TOTAL_ATTACHMENT_BYTES, toNodemailerAttachments } from "../utils/attachments";
import { RecipientStatus } from "../models/campaignRecipient.model";
import { logger } from "../utils/logger";
import { recordAudit } from "./auditLog.service";
import { findUnsubscribed, unsubscribeUrlFor } from "./unsubscribe.service";
import { addUnsubscribeFooter } from "../utils/unsubscribe";

const SEND_CONCURRENCY = 4;

export interface UploadSummary {
  campaignId: string;
  totalRecords: number;
  validRecipients: number;
  invalidRecipients: number;
  duplicateRecipients: number;
  willReceive: number;
}

export async function uploadClientList(
  createdBy: string,
  file: { buffer: Buffer; originalname: string },
  ipAddress: string | null,
): Promise<UploadSummary> {
  if (!file.originalname.toLowerCase().endsWith(".csv")) {
    throw ApiError.badRequest("Please upload a .csv file.");
  }

  const rows = parseClientListCsv(file.buffer);
  if (rows.length === 0) {
    throw ApiError.badRequest("The CSV has no usable rows to import.");
  }

  const seenEmails = new Set<string>();
  const unsubscribed = await findUnsubscribed(rows.map((r) => r.email));
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  const recipientRows = rows.map((row) => {
    const errors: string[] = [];
    if (!row.email) errors.push("Missing email address.");
    else if (!isValidEmail(row.email)) errors.push("Not a valid email address.");

    let status: RecipientStatus;
    if (errors.length > 0) {
      status = "invalid";
      invalidCount++;
    } else if (unsubscribed.has(row.email.toLowerCase())) {
      // Opted out: unsendable, so counted with the invalid rows.
      status = "unsubscribed";
      invalidCount++;
      errors.push("This address has unsubscribed from HelloCare emails.");
    } else {
      const normalized = row.email.toLowerCase();
      if (seenEmails.has(normalized)) {
        status = "duplicate";
        duplicateCount++;
        errors.push("This email address appears more than once in the uploaded file.");
      } else {
        seenEmails.add(normalized);
        status = "pending";
        validCount++;
      }
    }

    return {
      rowNumber: row.rowNumber,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      extraFields: row.extraFields,
      status,
      // Duplicates default OFF (only the first occurrence counts as sendable by
      // default) -- an admin can still opt a duplicate in explicitly, same as a
      // deselected valid row can be opted back out.
      isSelected: status === "pending",
      validationErrors: errors,
    };
  });

  const campaign = await Campaign.create({
    createdBy,
    originalFilename: file.originalname,
    status: "draft",
    totalRecipients: rows.length,
    validRecipients: validCount,
    invalidRecipients: invalidCount,
    duplicateRecipients: duplicateCount,
  });

  await CampaignRecipient.bulkCreate(recipientRows.map((r) => ({ ...r, campaignId: campaign.id })));

  await recordAudit(
    "client_list_uploaded",
    createdBy,
    { campaignId: campaign.id, filename: file.originalname, totalRecords: rows.length, validCount, invalidCount, duplicateCount },
    ipAddress,
  );

  return {
    campaignId: campaign.id,
    totalRecords: rows.length,
    validRecipients: validCount,
    invalidRecipients: invalidCount,
    duplicateRecipients: duplicateCount,
    willReceive: validCount, // duplicates are opted out by default; see isSelected above
  };
}

export async function listCampaigns() {
  return Campaign.findAll({
    order: [["createdAt", "DESC"]],
    include: [{ model: User, as: "creator", attributes: ["name", "email"] }],
  });
}

export async function getCampaign(id: string) {
  const campaign = await Campaign.findByPk(id, {
    include: [
      { model: CampaignRecipient, as: "recipients" },
      // The raw file bytes are excluded here -- this is metadata for the Compose page's
      // attachment list, never a place a multi-MB blob should ride along with every
      // ordinary campaign fetch. See getAttachmentForDownload for the one place the
      // actual bytes are read back out.
      { model: CampaignAttachment, as: "attachments", attributes: { exclude: ["data"] } },
      { model: User, as: "creator", attributes: ["name", "email"] },
    ],
  });
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  campaign.recipients?.sort((a, b) => a.rowNumber - b.rowNumber);
  return campaign;
}

export async function deleteCampaign(id: string, userId: string, ipAddress: string | null): Promise<void> {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  // Deletable regardless of status. The durable record of what was actually sent lives
  // in audit_logs (campaign_send_confirmed etc., keyed by campaignId in its own details
  // JSON, not a foreign key) and survives this delete -- this only removes the
  // draft/working copy (and, via cascade, its recipients and attachments).
  await recordAudit(
    "campaign_deleted",
    userId,
    { campaignId: id, filename: campaign.originalFilename, status: campaign.status, subject: campaign.subject },
    ipAddress,
  );
  await campaign.destroy();
}

function assertDraft(campaign: Campaign) {
  if (campaign.status !== "draft") {
    throw ApiError.conflict("This campaign has already been sent or is currently sending, and can no longer be edited.");
  }
}

export interface ComposeInput {
  fromAccountKey?: SenderAccountKey;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
}

export async function updateCompose(id: string, input: ComposeInput) {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  assertDraft(campaign);
  Object.assign(campaign, input);
  await campaign.save();
  return campaign;
}

export async function setRecipientSelected(campaignId: string, recipientId: string, isSelected: boolean) {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  assertDraft(campaign);
  const recipient = await CampaignRecipient.findOne({ where: { id: recipientId, campaignId } });
  if (!recipient) throw ApiError.notFound("Recipient not found.");
  if (isSelected && recipient.status === "invalid") {
    throw ApiError.badRequest("Invalid records cannot be selected for sending.");
  }
  if (isSelected && recipient.status === "unsubscribed") {
    throw ApiError.badRequest("This address has unsubscribed and cannot be selected for sending.");
  }
  recipient.isSelected = isSelected;
  await recipient.save();
  return recipient;
}

export async function removeRecipient(campaignId: string, recipientId: string): Promise<void> {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  assertDraft(campaign);
  const recipient = await CampaignRecipient.findOne({ where: { id: recipientId, campaignId } });
  if (!recipient) throw ApiError.notFound("Recipient not found.");

  const countField =
    recipient.status === "pending"
      ? ("validRecipients" as const)
      : recipient.status === "invalid" || recipient.status === "unsubscribed"
        ? ("invalidRecipients" as const)
        : recipient.status === "duplicate"
          ? ("duplicateRecipients" as const)
          : null;

  await recipient.destroy();
  campaign.totalRecipients -= 1;
  if (countField) campaign[countField] -= 1;
  await campaign.save();
}

export async function addAttachment(
  campaignId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<CampaignAttachment> {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  assertDraft(campaign);

  const existingTotal =
    ((await CampaignAttachment.sum("sizeBytes", { where: { campaignId } })) as number | null) ?? 0;
  if (existingTotal + file.buffer.length > MAX_TOTAL_ATTACHMENT_BYTES) {
    throw ApiError.badRequest(
      `Adding this file would put the campaign's total attachments over the ${Math.round(MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024))}MB limit. Remove another attachment first, or use a smaller file.`,
    );
  }

  return CampaignAttachment.create({
    campaignId,
    filename: file.originalname,
    mimeType: file.mimetype || "application/octet-stream",
    sizeBytes: file.buffer.length,
    data: file.buffer,
  });
}

export async function listAttachments(campaignId: string) {
  return CampaignAttachment.findAll({
    where: { campaignId },
    attributes: { exclude: ["data"] },
    order: [["createdAt", "ASC"]],
  });
}

export async function removeAttachment(campaignId: string, attachmentId: string): Promise<void> {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  assertDraft(campaign);
  const attachment = await CampaignAttachment.findOne({ where: { id: attachmentId, campaignId } });
  if (!attachment) throw ApiError.notFound("Attachment not found.");
  await attachment.destroy();
}

// The one place the raw bytes are read back out -- for the Compose page's "download to
// confirm" link, and for actually attaching the file to outgoing mail (see
// getAttachmentsForSending below).
export async function getAttachmentForDownload(campaignId: string, attachmentId: string): Promise<CampaignAttachment> {
  const attachment = await CampaignAttachment.findOne({ where: { id: attachmentId, campaignId } });
  if (!attachment) throw ApiError.notFound("Attachment not found.");
  return attachment;
}

async function getAttachmentsForSending(campaignId: string) {
  const attachments = await CampaignAttachment.findAll({ where: { campaignId } });
  return toNodemailerAttachments(attachments);
}

function toFields(r: { email: string; firstName: string; lastName: string; company: string; extraFields: Record<string, string> }): PersonalizationFields {
  // Built as a plain object, not a spread of the Sequelize instance -- spreading a
  // model instance doesn't reliably copy its attributes as own enumerable properties.
  return { email: r.email, firstName: r.firstName, lastName: r.lastName, company: r.company, extraFields: r.extraFields };
}

export interface RenderedEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export function renderEmailForRecipient(
  campaign: { subject: string; htmlBody: string; textBody: string },
  recipient: { email: string; firstName: string; lastName: string; company: string; extraFields: Record<string, string> },
): RenderedEmail {
  const fields = toFields(recipient);
  // Every campaign email ends with an unsubscribe link (2026-09-26); the footer isn't
  // editable from Compose.
  const withFooter = addUnsubscribeFooter(
    mergeHtml(formatEmailHtml(campaign.htmlBody), fields),
    mergePlainText(campaign.textBody, fields),
    unsubscribeUrlFor(recipient.email),
  );
  return {
    to: recipient.email,
    subject: mergePlainText(campaign.subject, fields),
    ...withFooter,
  };
}

function requireComposeComplete(campaign: Campaign): asserts campaign is Campaign & {
  fromAccountKey: SenderAccountKey;
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  if (!campaign.fromAccountKey || !campaign.subject || !campaign.htmlBody || !campaign.textBody) {
    throw ApiError.badRequest("Select a sender account and fill in the subject, HTML body, and plain-text body first.");
  }
}

export async function previewRecipient(campaignId: string, recipientId: string): Promise<RenderedEmail> {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  requireComposeComplete(campaign);
  const recipient = await CampaignRecipient.findOne({ where: { id: recipientId, campaignId } });
  if (!recipient) throw ApiError.notFound("Recipient not found.");
  return renderEmailForRecipient(campaign, recipient);
}

export async function sendTestEmail(
  campaignId: string,
  testEmail: string,
  userId: string,
  ipAddress: string | null,
): Promise<void> {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  requireComposeComplete(campaign);

  const sampleRecipient = await CampaignRecipient.findOne({
    where: { campaignId, status: { [Op.in]: ["pending", "queued", "sent"] } },
    order: [["rowNumber", "ASC"]],
  });
  const sample = sampleRecipient
    ? toFields(sampleRecipient)
    : { email: testEmail, firstName: "Example", lastName: "Client", company: "Example Company", extraFields: {} };

  const rendered = renderEmailForRecipient(campaign, { ...sample, email: testEmail });
  const attachments = await getAttachmentsForSending(campaignId);
  // Must fail loudly -- the admin clicked "Send test" specifically to find out whether
  // sending actually works, unlike a real batched send where one bad recipient must not
  // stop the rest of the campaign.
  await sendAs(campaign.fromAccountKey, {
    to: testEmail,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    headers: rendered.headers,
    attachments,
  });
  await recordAudit("test_email_sent", userId, { campaignId, testEmail, attachmentCount: attachments.length }, ipAddress);
}

export async function confirmSend(campaignId: string, userId: string, ipAddress: string | null): Promise<void> {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found.");
  requireComposeComplete(campaign);

  const selectedCount = await CampaignRecipient.count({
    where: { campaignId, isSelected: true, status: { [Op.in]: ["pending", "duplicate"] } },
  });
  if (selectedCount === 0) {
    throw ApiError.badRequest("No recipients are selected to send to.");
  }

  // Atomic guard against a double-click or a duplicate submission from a page refresh:
  // only the request that actually flips draft -> sending wins; any other concurrent
  // request sees affectedCount 0 and is rejected outright.
  const [affectedCount] = await Campaign.update(
    { status: "sending", confirmedAt: new Date() },
    { where: { id: campaignId, status: "draft" } },
  );
  if (affectedCount === 0) {
    throw ApiError.conflict("This campaign has already been sent or is currently sending.");
  }

  await CampaignRecipient.update(
    { status: "queued" },
    { where: { campaignId, isSelected: true, status: { [Op.in]: ["pending", "duplicate"] } } },
  );
  await CampaignRecipient.update(
    { status: "skipped" },
    { where: { campaignId, isSelected: false, status: "pending" } },
  );

  await recordAudit("campaign_send_confirmed", userId, { campaignId, recipientCount: selectedCount, fromAccountKey: campaign.fromAccountKey, subject: campaign.subject }, ipAddress);

  processCampaignSend(campaignId).catch((err) => {
    logger.error(`Campaign ${campaignId} processing crashed`, err);
  });
}

// Deliberately not awaited by confirmSend/resumeInterruptedCampaigns -- the HTTP request
// returns immediately with status "sending" and the frontend polls GET /campaigns/:id
// for progress. There's no separate job queue (no Redis/Bull) here; this in-process
// worker pool is the pragmatic equivalent for a client list of a few thousand at most.
export async function processCampaignSend(campaignId: string): Promise<void> {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) return;
  requireComposeComplete(campaign);
  const { fromAccountKey, subject, htmlBody, textBody } = campaign;

  const recipients = await CampaignRecipient.findAll({
    where: { campaignId, status: { [Op.in]: ["queued", "sending"] } },
    order: [["rowNumber", "ASC"]],
  });
  // Fetched once per campaign send, not once per recipient -- the same attached file(s)
  // go out with every copy.
  const attachments = await getAttachmentsForSending(campaignId);

  // Re-checked at send time: someone may have unsubscribed after the list was uploaded.
  const unsubscribed = await findUnsubscribed(recipients.map((r) => r.email));

  let cursor = 0;
  async function worker() {
    for (;;) {
      const recipient = recipients[cursor++];
      if (!recipient) return;
      if (unsubscribed.has(recipient.email.toLowerCase())) {
        recipient.status = "unsubscribed";
        recipient.errorMessage = "Not sent: this address has unsubscribed from HelloCare emails.";
        await recipient.save();
        continue;
      }
      recipient.status = "sending";
      await recipient.save();
      try {
        const rendered = renderEmailForRecipient({ subject, htmlBody, textBody }, recipient);
        await sendAs(fromAccountKey, { to: rendered.to, subject: rendered.subject, html: rendered.html, text: rendered.text, headers: rendered.headers, attachments });
        recipient.status = "sent";
        recipient.sentAt = new Date();
        recipient.errorMessage = null;
        await recipient.save();
        await Campaign.increment("sentCount", { where: { id: campaignId } });
      } catch (err) {
        // One recipient failing must never stop the rest of the batch.
        recipient.status = "failed";
        recipient.errorMessage = err instanceof Error ? err.message : "Failed to send this email.";
        await recipient.save();
        await Campaign.increment("failedCount", { where: { id: campaignId } });
        logger.error(`Failed to send campaign ${campaignId} email to ${recipient.email}`, err);
      }
    }
  }

  await Promise.all(Array.from({ length: SEND_CONCURRENCY }, worker));

  const skippedCount = await CampaignRecipient.count({ where: { campaignId, status: "skipped" } });
  await Campaign.update({ status: "completed", skippedCount }, { where: { id: campaignId } });
}

// Called once at server boot. A send that was in progress when the process last stopped
// otherwise leaves its campaign stuck on "sending" forever with recipients stranded in
// "queued"/"sending" -- this re-picks up exactly those rows.
export async function resumeInterruptedCampaigns(): Promise<void> {
  const stuck = await Campaign.findAll({ where: { status: "sending" } });
  for (const campaign of stuck) {
    logger.info(`Resuming interrupted campaign ${campaign.id}`);
    processCampaignSend(campaign.id).catch((err) => {
      logger.error(`Failed to resume campaign ${campaign.id}`, err);
    });
  }
}
