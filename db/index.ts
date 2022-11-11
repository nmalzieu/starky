import { AppDataSource } from "./data-source";
import { DiscordMember } from "./entity/DiscordMember";
import { DiscordServerConfig } from "./entity/DiscordServerConfig";
import { setupMigrations } from "./setup-migrations";

export const setupDb = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await setupMigrations();
    await AppDataSource.runMigrations({ transaction: "each" });
  }
};

export const DiscordServerConfigRepository =
  AppDataSource.getRepository(DiscordServerConfig);
export const DiscordMemberRepository =
  AppDataSource.getRepository(DiscordMember);
