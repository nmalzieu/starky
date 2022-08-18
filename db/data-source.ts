import "reflect-metadata";
import { DataSource } from "typeorm";
import { DiscordMember } from "./entity/DiscordMember";
import { DiscordServer } from "./entity/DiscordServer";
import config from "../config";

export const AppDataSource = new DataSource({
  type: "postgres",
  port: config.DB_PORT,
  host: config.DB_HOST,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_DATABASE,
  synchronize: true,
  logging: false,
  entities: [DiscordServer, DiscordMember],
  migrations: [],
  subscribers: [],
});
