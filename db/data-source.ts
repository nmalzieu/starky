import { DataSource } from "typeorm";

import "reflect-metadata";

import config from "../config";

import { DiscordMember } from "./entity/DiscordMember";
import { DiscordServer } from "./entity/DiscordServer";
import { DiscordServerConfig } from "./entity/DiscordServerConfig";
import { NetworkStatus } from "./entity/NetworkStatus";

export const AppDataSource = new DataSource({
  type: "postgres",
  port: config.DB_PORT,
  host: config.DB_HOST,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_DATABASE,
  synchronize: false,
  logging: false,
  entities: [DiscordServer, DiscordServerConfig, DiscordMember, NetworkStatus],
  migrations: [__dirname + "/migration/**/*.{js,ts}"],
  migrationsTableName: "migrations",
  subscribers: [],
});
