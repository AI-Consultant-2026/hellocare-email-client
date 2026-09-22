import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("campaign_attachments", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "campaigns", key: "id" },
        onDelete: "CASCADE",
      },
      filename: { type: DataTypes.STRING, allowNull: false },
      mime_type: { type: DataTypes.STRING, allowNull: false },
      size_bytes: { type: DataTypes.INTEGER, allowNull: false },
      // Stored directly in Postgres (BYTEA), not on local disk -- this service's
      // filesystem is ephemeral (lost on redeploy/restart), and a campaign can sit in
      // draft for a while before being sent. Kept small by the 10MB-per-file /
      // 20MB-per-campaign caps enforced in campaign.service.ts.
      data: { type: DataTypes.BLOB, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("campaign_attachments", ["campaign_id"]);
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("campaign_attachments");
  },
};
