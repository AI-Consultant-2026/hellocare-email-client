import { Router } from "express";
import * as campaignController from "../controllers/campaign.controller";
import { authenticate } from "../middleware/authenticate";
import { sendRateLimiter } from "../middleware/rateLimiters";
import { uploadAttachment, uploadCsv } from "../middleware/upload";
import { validate } from "../middleware/validate";
import {
  attachmentIdSchema,
  campaignIdSchema,
  composeSchema,
  previewSchema,
  removeRecipientSchema,
  sendTestEmailSchema,
  toggleRecipientSchema,
} from "../validators/campaign.validators";

const router = Router();
router.use(authenticate);

router.post("/", uploadCsv.single("file"), campaignController.upload);
router.get("/", campaignController.list);
router.get("/:id", validate(campaignIdSchema), campaignController.get);
router.patch("/:id", validate(composeSchema), campaignController.compose);
router.delete("/:id", validate(campaignIdSchema), campaignController.remove);
router.patch(
  "/:id/recipients/:recipientId",
  validate(toggleRecipientSchema),
  campaignController.setRecipientSelected,
);
router.delete(
  "/:id/recipients/:recipientId",
  validate(removeRecipientSchema),
  campaignController.removeRecipient,
);
router.get("/:id/preview/:recipientId", validate(previewSchema), campaignController.previewRecipient);
router.post(
  "/:id/test-send",
  sendRateLimiter,
  validate(sendTestEmailSchema),
  campaignController.sendTestEmail,
);
router.post(
  "/:id/confirm-send",
  sendRateLimiter,
  validate(campaignIdSchema),
  campaignController.confirmSend,
);

router.post(
  "/:id/attachments",
  validate(campaignIdSchema),
  uploadAttachment.single("file"),
  campaignController.uploadAttachment,
);
router.get("/:id/attachments", validate(campaignIdSchema), campaignController.listAttachments);
router.get(
  "/:id/attachments/:attachmentId/download",
  validate(attachmentIdSchema),
  campaignController.downloadAttachment,
);
router.delete(
  "/:id/attachments/:attachmentId",
  validate(attachmentIdSchema),
  campaignController.removeAttachment,
);

export default router;
