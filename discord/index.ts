import config from "../config";
import { createDiscordClient } from "./client";
import { setupInteractions } from "./interactions";
import { registerSlashCommands } from "./slashCommands";

const verifyConfig = () => {
  if (!config.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
    throw new Error(`Missing config: NEXT_PUBLIC_DISCORD_CLIENT_ID`);
  }
  if (!config.DISCORD_BOT_TOKEN) {
    throw new Error(`Missing config: DISCORD_BOT_TOKEN`);
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
