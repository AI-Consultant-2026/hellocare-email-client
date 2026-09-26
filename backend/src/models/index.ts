import { Sequelize } from "sequelize";
import { AuditLog, initAuditLogModel } from "./auditLog.model";
import { Campaign, initCampaignModel } from "./campaign.model";
import { CampaignAttachment, initCampaignAttachmentModel } from "./campaignAttachment.model";
import { CampaignRecipient, initCampaignRecipientModel } from "./campaignRecipient.model";
import { EmailUnsubscribe, initEmailUnsubscribeModel } from "./emailUnsubscribe.model";
import { initRefreshTokenModel, RefreshToken } from "./refreshToken.model";
import { initUserModel, User } from "./user.model";

// Built directly from env here rather than importing config/database.js (that file is
// for sequelize-cli's own config loading via .sequelizerc, a separate, JS-only code
// path) -- keeps this file plain TypeScript with no cross-import declaration-file issue.
const nodeEnv = process.env.NODE_ENV || "development";
const databaseUrl = nodeEnv === "test" ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL : process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
  dialectOptions: nodeEnv === "production" ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

initUserModel(sequelize);
initRefreshTokenModel(sequelize);
initCampaignModel(sequelize);
initCampaignRecipientModel(sequelize);
initCampaignAttachmentModel(sequelize);
initAuditLogModel(sequelize);
initEmailUnsubscribeModel(sequelize);

User.hasMany(RefreshToken, { foreignKey: "userId" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Campaign, { foreignKey: "createdBy", as: "campaigns" });
Campaign.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Campaign.hasMany(CampaignRecipient, { foreignKey: "campaignId", as: "recipients", onDelete: "CASCADE" });
CampaignRecipient.belongsTo(Campaign, { foreignKey: "campaignId" });

Campaign.hasMany(CampaignAttachment, { foreignKey: "campaignId", as: "attachments", onDelete: "CASCADE" });
CampaignAttachment.belongsTo(Campaign, { foreignKey: "campaignId" });

User.hasMany(AuditLog, { foreignKey: "userId" });
AuditLog.belongsTo(User, { foreignKey: "userId" });

export { AuditLog, Campaign, CampaignAttachment, CampaignRecipient, EmailUnsubscribe, RefreshToken, User };
