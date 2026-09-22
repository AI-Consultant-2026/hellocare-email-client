import { DataTypes, Model, Optional, Sequelize } from "sequelize";

// General-purpose audit trail: login attempts, uploads, sends -- anything security- or
// delivery-relevant. `details` is a small JSON blob per action; it must never contain a
// password, token, or SMTP credential (see auditLog.service.ts, the only writer).
export interface AuditLogAttributes {
  id: string;
  userId: string | null;
  action: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt?: Date;
}

export type AuditLogCreationAttributes = Optional<AuditLogAttributes, "id" | "details" | "ipAddress" | "createdAt">;

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: string;
  declare userId: string | null;
  declare action: string;
  declare details: Record<string, unknown>;
  declare ipAddress: string | null;
  declare readonly createdAt: Date;
}

export function initAuditLogModel(sequelize: Sequelize) {
  AuditLog.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: true, field: "user_id" },
      action: { type: DataTypes.STRING, allowNull: false },
      details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      ipAddress: { type: DataTypes.STRING, allowNull: true, field: "ip_address" },
    },
    {
      sequelize,
      modelName: "AuditLog",
      tableName: "audit_logs",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );
  return AuditLog;
}
