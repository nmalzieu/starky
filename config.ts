import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const config = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
  DISCORD_ROLE: process.env.DISCORD_ROLE || "",
  DOMAIN: process.env.DOMAIN || "http://localhost:3000",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  DB_USERNAME: process.env.DB_USERNAME || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
  DB_DATABASE: process.env.DB_DATABASE || "starkcord",
  UPDATE_STATUS_EVERY_SECONDS: process.env.UPDATE_STATUS_EVERY_SECONDS
    ? parseInt(process.env.UPDATE_STATUS_EVERY_SECONDS, 10)
    : 5 * 60,
};

export default config;
