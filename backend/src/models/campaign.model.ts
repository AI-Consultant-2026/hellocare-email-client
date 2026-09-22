import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { SenderAccountKey } from "../config";
import { CampaignRecipient } from "./campaignRecipient.model";
import { User } from "./user.model";

export type CampaignStatus = "draft" | "sending" | "completed";

export interface CampaignAttributes {
  id: string;
  createdBy: string;
  originalFilename: string;
  fromAccountKey: SenderAccountKey | null;
  subject: string | null;
  htmlBody: string | null;
  textBody: string | null;
  status: CampaignStatus;
  totalRecipients: number;
  validRecipients: number;
  invalidRecipients: number;
  duplicateRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  confirmedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CampaignCreationAttributes = Optional<
  CampaignAttributes,
  | "id"
  | "fromAccountKey"
  | "subject"
  | "htmlBody"
  | "textBody"
  | "status"
  | "sentCount"
  | "failedCount"
  | "skippedCount"
  | "confirmedAt"
  | "createdAt"
  | "updatedAt"
>;

export class Campaign extends Model<CampaignAttributes, CampaignCreationAttributes> implements CampaignAttributes {
  declare id: string;
  declare createdBy: string;
  declare originalFilename: string;
  declare fromAccountKey: SenderAccountKey | null;
  declare subject: string | null;
  declare htmlBody: string | null;
  declare textBody: string | null;
  declare status: CampaignStatus;
  declare totalRecipients: number;
  declare validRecipients: number;
  declare invalidRecipients: number;
  declare duplicateRecipients: number;
  declare sentCount: number;
  declare failedCount: number;
  declare skippedCount: number;
  declare confirmedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Populated only when explicitly `include`d -- not real columns.
  declare recipients?: CampaignRecipient[];
  declare creator?: User;
}

export function initCampaignModel(sequelize: Sequelize) {
  Campaign.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
      originalFilename: { type: DataTypes.STRING, allowNull: false, field: "original_filename" },
      fromAccountKey: { type: DataTypes.STRING, allowNull: true, field: "from_account_key" },
      subject: { type: DataTypes.STRING, allowNull: true },
      htmlBody: { type: DataTypes.TEXT, allowNull: true, field: "html_body" },
      textBody: { type: DataTypes.TEXT, allowNull: true, field: "text_body" },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
      totalRecipients: { type: DataTypes.INTEGER, allowNull: false, field: "total_recipients" },
      validRecipients: { type: DataTypes.INTEGER, allowNull: false, field: "valid_recipients" },
      invalidRecipients: { type: DataTypes.INTEGER, allowNull: false, field: "invalid_recipients" },
      duplicateRecipients: { type: DataTypes.INTEGER, allowNull: false, field: "duplicate_recipients" },
      sentCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "sent_count" },
      failedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "failed_count" },
      skippedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "skipped_count" },
      confirmedAt: { type: DataTypes.DATE, allowNull: true, field: "confirmed_at" },
    },
    { sequelize, modelName: "Campaign", tableName: "campaigns", underscored: true, timestamps: true },
  );
  return Campaign;
}
