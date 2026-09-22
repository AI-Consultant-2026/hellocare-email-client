import { DataTypes, Model, Optional, Sequelize } from "sequelize";

// Closed system: there is no public registration route. Accounts are created only via
// `npm run create-user` (src/scripts/createUser.ts), run by whoever administers this
// deployment -- see README. "role" exists now for forward compatibility but every
// current user is effectively an equal authorised admin; nothing today branches on it.
export type UserRole = "admin";

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserCreationAttributes = Optional<UserAttributes, "id" | "role" | "isActive" | "createdAt" | "updatedAt">;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare name: string;
  declare role: UserRole;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initUserModel(sequelize: Sequelize) {
  User.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false, field: "password_hash" },
      name: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false, defaultValue: "admin" },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "is_active" },
    },
    { sequelize, modelName: "User", tableName: "users", underscored: true, timestamps: true },
  );
  return User;
}
