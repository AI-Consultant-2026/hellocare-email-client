import { DataTypes, Model, Optional, Sequelize } from "sequelize";

// Validation classification (invalid/duplicate) and send lifecycle (pending..failed)
// share one column on purpose -- a row is either not sendable (invalid/duplicate) or
// moves pending -> queued -> sending -> sent/failed. "Skipped" is a valid row the admin
// explicitly deselected before confirming send.
export type RecipientStatus =
  | "pending"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "skipped"
  | "invalid"
  | "duplicate";

export interface CampaignRecipientAttributes {
  id: string;
  campaignId: string;
  rowNumber: number;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  // Any CSV columns beyond email/first_name/last_name/company, keyed by their original
  // header -- so a future column is preserved and usable in {{personalisation}} without
  // a schema change.
  extraFields: Record<string, string>;
  status: RecipientStatus;
  isSelected: boolean;
  validationErrors: string[];
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CampaignRecipientCreationAttributes = Optional<
  CampaignRecipientAttributes,
  "id" | "extraFields" | "validationErrors" | "errorMessage" | "sentAt" | "createdAt" | "updatedAt"
>;

export class CampaignRecipient
  extends Model<CampaignRecipientAttributes, CampaignRecipientCreationAttributes>
  implements CampaignRecipientAttributes
{
  declare id: string;
  declare campaignId: string;
  declare rowNumber: number;
  declare email: string;
  declare firstName: string;
  declare lastName: string;
  declare company: string;
  declare extraFields: Record<string, string>;
  declare status: RecipientStatus;
  declare isSelected: boolean;
  declare validationErrors: string[];
  declare errorMessage: string | null;
  declare sentAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initCampaignRecipientModel(sequelize: Sequelize) {
  CampaignRecipient.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      campaignId: { type: DataTypes.UUID, allowNull: false, field: "campaign_id" },
      rowNumber: { type: DataTypes.INTEGER, allowNull: false, field: "row_number" },
      email: { type: DataTypes.STRING, allowNull: false },
      firstName: { type: DataTypes.STRING, allowNull: false, defaultValue: "", field: "first_name" },
      lastName: { type: DataTypes.STRING, allowNull: false, defaultValue: "", field: "last_name" },
      company: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      extraFields: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: "extra_fields" },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      isSelected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "is_selected" },
      validationErrors: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: "validation_errors" },
      errorMessage: { type: DataTypes.TEXT, allowNull: true, field: "error_message" },
      sentAt: { type: DataTypes.DATE, allowNull: true, field: "sent_at" },
    },
    {
      sequelize,
      modelName: "CampaignRecipient",
      tableName: "campaign_recipients",
      underscored: true,
      timestamps: true,
    },
  );
  return CampaignRecipient;
}
