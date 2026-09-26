import { Router } from "express";
import rateLimit from "express-rate-limit";
import { unsubscribe } from "../services/unsubscribe.service";
import { asyncHandler } from "../utils/asyncHandler";
import { renderUnsubscribePage } from "../utils/unsubscribe";

// Public (no login): the link in every campaign email. GET is the click; POST is mail
// apps' one-click unsubscribe (RFC 8058).
const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

const handler = asyncHandler(async (req, res) => {
  const ok = await unsubscribe(String(req.query.e ?? ""), String(req.query.t ?? ""));
  if (req.method === "POST") {
    res.status(ok ? 200 : 400).json({ ok });
    return;
  }
  res.status(ok ? 200 : 400).type("html").send(renderUnsubscribePage(ok));
});
router.get("/", limiter, handler);
router.post("/", limiter, handler);

export default router;
