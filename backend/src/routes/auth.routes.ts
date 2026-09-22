import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { loginRateLimiter } from "../middleware/rateLimiters";
import { validate } from "../middleware/validate";
import { loginSchema } from "../validators/auth.validators";

const router = Router();

router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
