import { Router } from "express";
import { SENDER_ACCOUNTS } from "../config";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// Display-only: label + email address for the Settings page. Never returns the
// password env-var name or any credential -- there is nothing here for a client to
// send back that would change which account can be used, by design.
router.get("/", authenticate, (_req, res) => {
  res.json({ accounts: SENDER_ACCOUNTS.map(({ key, email, label }) => ({ key, email, label })) });
});

export default router;
