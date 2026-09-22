require("dotenv/config");

function buildConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const databaseUrl =
    nodeEnv === "test" ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL : process.env.DATABASE_URL;

  return {
    url: databaseUrl,
    dialect: "postgres",
    logging: false,
    dialectOptions: nodeEnv === "production" ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  };
}

const envConfig = buildConfig();

module.exports = {
  development: envConfig,
  test: envConfig,
  production: envConfig,
};
