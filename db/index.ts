import { AppDataSource } from "./data-source";
import { DiscordMember } from "./entity/DiscordMember";
import { DiscordServer } from "./entity/DiscordServer";
import { setupMigrations } from "./setup-migrations";

export const setupDb = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await setupMigrations();
    await AppDataSource.runMigrations({ transaction: "each" });
  }
};

export const DiscordServerRepository =
  AppDataSource.getRepository(DiscordServer);
export const DiscordMemberRepository =
  AppDataSource.getRepository(DiscordMember);
