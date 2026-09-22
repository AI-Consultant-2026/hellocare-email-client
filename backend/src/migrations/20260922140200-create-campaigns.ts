import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("campaigns", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      original_filename: { type: DataTypes.STRING, allowNull: false },
      from_account_key: { type: DataTypes.STRING, allowNull: true },
      subject: { type: DataTypes.STRING, allowNull: true },
      html_body: { type: DataTypes.TEXT, allowNull: true },
      text_body: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
      total_recipients: { type: DataTypes.INTEGER, allowNull: false },
      valid_recipients: { type: DataTypes.INTEGER, allowNull: false },
      invalid_recipients: { type: DataTypes.INTEGER, allowNull: false },
      duplicate_recipients: { type: DataTypes.INTEGER, allowNull: false },
      sent_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      failed_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      skipped_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      confirmed_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("campaigns", ["created_by"]);
    await queryInterface.addIndex("campaigns", ["status"]);
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("campaigns");
  },
};
