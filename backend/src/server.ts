import { createApp } from "./app";
import { config } from "./config";
import { sequelize } from "./models";
import { resumeInterruptedCampaigns } from "./services/campaign.service";
import { logger } from "./utils/logger";

const app = createApp();

async function start() {
  await sequelize.authenticate();
  logger.info("Database connection established");

  const server = app.listen(config.port, () => {
    logger.info(`Backend listening on port ${config.port} (${config.nodeEnv})`);
  });

  if (config.nodeEnv !== "test") {
    resumeInterruptedCampaigns().catch((err) => {
      logger.error("Failed to resume interrupted campaigns on startup", err);
    });
  }

  function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => process.exit(0));
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
