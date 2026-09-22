import { DataTypes, Model, Optional, Sequelize } from "sequelize";

// Only the SHA-256 hash of the refresh token is stored, never the token itself -- mirrors
// how an access-token secret is never logged. A stolen DB row alone can't be replayed as
// a cookie.
export interface RefreshTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt?: Date;
}

export type RefreshTokenCreationAttributes = Optional<RefreshTokenAttributes, "id" | "revokedAt" | "createdAt">;

export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: Date | null;
  declare readonly createdAt: Date;
}

export function initRefreshTokenModel(sequelize: Sequelize) {
  RefreshToken.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      tokenHash: { type: DataTypes.STRING, allowNull: false, field: "token_hash" },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: "expires_at" },
      revokedAt: { type: DataTypes.DATE, allowNull: true, field: "revoked_at" },
    },
    {
      sequelize,
      modelName: "RefreshToken",
      tableName: "refresh_tokens",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );
  return RefreshToken;
}
