import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("audit_logs", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      action: { type: DataTypes.STRING, allowNull: false },
      details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      ip_address: { type: DataTypes.STRING, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("audit_logs", ["created_at"]);
    await queryInterface.addIndex("audit_logs", ["action"]);
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("audit_logs");
  },
};
