import * as dotenv from "dotenv";
import parseDatabaseUrl from "ts-parse-database-url";

dotenv.config({ path: ".env.local" });

let DB_HOST = process.env.DB_HOST || "localhost";
let DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
let DB_USERNAME = process.env.DB_USERNAME || "postgres";
let DB_PASSWORD = process.env.DB_PASSWORD || "postgres";
let DB_DATABASE = process.env.DB_DATABASE || "starkcord";

if (process.env.DATABASE_URL) {
  const parsedUrl = parseDatabaseUrl(process.env.DATABASE_URL);
  DB_HOST = parsedUrl.host || DB_HOST;
  DB_PORT = parsedUrl.port || DB_PORT;
  DB_USERNAME = parsedUrl.user || DB_USERNAME;
  DB_PASSWORD = parsedUrl.password || DB_PASSWORD;
  DB_DATABASE = parsedUrl.database || DB_DATABASE;
}

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
  HOST: process.env.HOST || "localhost",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
};

export default config;
