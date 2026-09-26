import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Addresses that clicked "Unsubscribe" in a campaign email (2026-09-26). One row per
    // lowercased address; campaigns never send to an address listed here.
    await queryInterface.createTable("email_unsubscribes", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("email_unsubscribes");
  },
};
