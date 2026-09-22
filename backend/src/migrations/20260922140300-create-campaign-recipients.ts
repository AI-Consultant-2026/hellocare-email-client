import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("campaign_recipients", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campaigns", key: "id" },
        onDelete: "CASCADE",
      },
      row_number: { type: DataTypes.INTEGER, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false },
      first_name: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      last_name: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      company: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      extra_fields: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      is_selected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      validation_errors: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      error_message: { type: DataTypes.TEXT, allowNull: true },
      sent_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("campaign_recipients", ["campaign_id"]);
    await queryInterface.addIndex("campaign_recipients", ["campaign_id", "status"]);
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("campaign_recipients");
  },
};
