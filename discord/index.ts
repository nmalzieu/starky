import config from "../config";
import { createDiscordClient } from "./client";
import { setupInteractions } from "./interactions";
import { registerSlashCommands } from "./slashCommands";

const verifyConfig = () => {
  if (!config.DISCORD_CLIENT_ID) {
    throw new Error(`Missing config: DISCORD_CLIENT_ID`);
  }
  if (!config.DISCORD_TOKEN) {
    throw new Error(`Missing config: DISCORD_TOKEN`);
  }
  if (!config.DISCORD_ROLE) {
    throw new Error(`Missing config: DISCORD_ROLE`);
  }
};

export const launchBot = async () => {
  verifyConfig();
  const client = await createDiscordClient();
  await registerSlashCommands();
  setupInteractions(client);
};
