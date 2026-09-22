import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface CampaignAttachmentAttributes {
  id: string;
  campaignId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
  createdAt?: Date;
}

export type CampaignAttachmentCreationAttributes = Optional<CampaignAttachmentAttributes, "id" | "createdAt">;

export class CampaignAttachment
  extends Model<CampaignAttachmentAttributes, CampaignAttachmentCreationAttributes>
  implements CampaignAttachmentAttributes
{
  declare id: string;
  declare campaignId: string;
  declare filename: string;
  declare mimeType: string;
  declare sizeBytes: number;
  declare data: Buffer;
  declare readonly createdAt: Date;
}

export function initCampaignAttachmentModel(sequelize: Sequelize) {
  CampaignAttachment.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      campaignId: { type: DataTypes.UUID, allowNull: false, field: "campaign_id" },
      filename: { type: DataTypes.STRING, allowNull: false },
      mimeType: { type: DataTypes.STRING, allowNull: false, field: "mime_type" },
      sizeBytes: { type: DataTypes.INTEGER, allowNull: false, field: "size_bytes" },
      data: { type: DataTypes.BLOB, allowNull: false },
    },
    {
      sequelize,
      modelName: "CampaignAttachment",
      tableName: "campaign_attachments",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );
  return CampaignAttachment;
}
