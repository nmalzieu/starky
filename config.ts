import * as dotenv from "dotenv";
import parseDatabaseUrl from "ts-parse-database-url";

dotenv.config({ path: ".env.local" });

let DB_HOST = process.env.DB_HOST || "localhost";
let DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
let DB_USERNAME = process.env.DB_USERNAME || "postgres";
let DB_PASSWORD = process.env.DB_PASSWORD || "postgres";
let DB_DATABASE = process.env.DB_DATABASE || "starky";

if (process.env.DATABASE_URL) {
  const parsedUrl = parseDatabaseUrl(process.env.DATABASE_URL);
  DB_HOST = parsedUrl.host || DB_HOST;
  DB_PORT = parsedUrl.port || DB_PORT;
  DB_USERNAME = parsedUrl.user || DB_USERNAME;
  DB_PASSWORD = parsedUrl.password || DB_PASSWORD;
  DB_DATABASE = parsedUrl.database || DB_DATABASE;
}

const config = {
  NEXT_PUBLIC_DISCORD_CLIENT_ID:
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "",
  DOMAIN: process.env.DOMAIN || "http://localhost:8080",
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DATABASE,
  UPDATE_STATUS_EVERY_SECONDS: process.env.UPDATE_STATUS_EVERY_SECONDS
    ? parseInt(process.env.UPDATE_STATUS_EVERY_SECONDS, 10)
    : 5 * 60,
  HOST: process.env.HOST || "localhost",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
};

export default config;
