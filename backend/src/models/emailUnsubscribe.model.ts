import { DataTypes, Model, Optional, Sequelize } from "sequelize";

// An address that opted out of campaign email. `email` is always stored lowercased.
export interface EmailUnsubscribeAttributes {
  id: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EmailUnsubscribeCreationAttributes = Optional<EmailUnsubscribeAttributes, "id" | "createdAt" | "updatedAt">;

export class EmailUnsubscribe
  extends Model<EmailUnsubscribeAttributes, EmailUnsubscribeCreationAttributes>
  implements EmailUnsubscribeAttributes
{
  declare id: string;
  declare email: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initEmailUnsubscribeModel(sequelize: Sequelize) {
  EmailUnsubscribe.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    { sequelize, modelName: "EmailUnsubscribe", tableName: "email_unsubscribes", underscored: true, timestamps: true },
  );
  return EmailUnsubscribe;
}
