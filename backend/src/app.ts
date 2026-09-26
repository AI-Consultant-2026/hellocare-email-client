import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import auditLogRoutes from "./routes/auditLog.routes";
import authRoutes from "./routes/auth.routes";
import campaignRoutes from "./routes/campaign.routes";
import senderAccountsRoutes from "./routes/senderAccounts.routes";
import unsubscribeRoutes from "./routes/unsubscribe.routes";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1); // Render sits behind a proxy; needed for req.ip and secure cookies
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  if (config.nodeEnv !== "test") {
    app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
  }

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/campaigns", campaignRoutes);
  app.use("/api/sender-accounts", senderAccountsRoutes);
  app.use("/api/audit-logs", auditLogRoutes);
  // Public: the unsubscribe link in every campaign email (no login).
  app.use("/api/unsubscribe", unsubscribeRoutes);

  // Frontend + API served from the same origin in production (see Dockerfile) --
  // anything not matched above falls through to the built React app.
  const publicDir = path.join(__dirname, "..", "public");
  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next();
    });
  });

  app.use(errorHandler);
  return app;
}
