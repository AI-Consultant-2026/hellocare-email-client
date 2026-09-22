import { Router } from "express";
import { AuditLog, User } from "../models";
import { authenticate } from "../middleware/authenticate";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await AuditLog.findAll({
      order: [["createdAt", "DESC"]],
      limit,
      include: [{ model: User, attributes: ["name", "email"] }],
    });
    res.json({ logs });
  }),
);

export default router;
