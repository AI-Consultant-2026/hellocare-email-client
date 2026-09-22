import { Request, Response } from "express";
import * as campaignService from "../services/campaign.service";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No file was uploaded. Choose a .csv file.");
  const summary = await campaignService.uploadClientList(
    req.user!.id,
    { buffer: req.file.buffer, originalname: req.file.originalname },
    req.ip ?? null,
  );
  res.status(201).json(summary);
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ campaigns: await campaignService.listCampaigns() });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json({ campaign: await campaignService.getCampaign(req.params.id as string) });
});

export const compose = asyncHandler(async (req: Request, res: Response) => {
  res.json({ campaign: await campaignService.updateCompose(req.params.id as string, req.body) });
});

export const setRecipientSelected = asyncHandler(async (req: Request, res: Response) => {
  const recipient = await campaignService.setRecipientSelected(
    req.params.id as string,
    req.params.recipientId as string,
    req.body.isSelected,
  );
  res.json({ recipient });
});

export const removeRecipient = asyncHandler(async (req: Request, res: Response) => {
  await campaignService.removeRecipient(req.params.id as string, req.params.recipientId as string);
  res.status(204).end();
});

export const previewRecipient = asyncHandler(async (req: Request, res: Response) => {
  const preview = await campaignService.previewRecipient(req.params.id as string, req.params.recipientId as string);
  res.json({ preview });
});

export const sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
  await campaignService.sendTestEmail(req.params.id as string, req.body.testEmail, req.user!.id, req.ip ?? null);
  res.status(204).end();
});

export const confirmSend = asyncHandler(async (req: Request, res: Response) => {
  await campaignService.confirmSend(req.params.id as string, req.user!.id, req.ip ?? null);
  res.status(202).json({ status: "sending" });
});
