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
};

export const launchBot = async () => {
  try {
    verifyConfig();
  } catch (e) {
    console.error(e);
    return;
  }
  const client = await createDiscordClient();
  await registerSlashCommands();
  setupInteractions(client);
};
