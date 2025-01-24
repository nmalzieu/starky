import { REST } from "@discordjs/rest";
import { Client, GatewayIntentBits } from "discord.js";

import config from "../config";
import WatchTowerLogger from "../watchTower";

export const createDiscordClient = (): Promise<Client> =>
  new Promise((resolve, reject) => {
    WatchTowerLogger.info("> Connecting to Discord...");
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.once("ready", () => {
      WatchTowerLogger.info("> Discord bot launched successfully");
      resolve(client);
    });
    client.login(config.DISCORD_BOT_TOKEN).catch((e) => {
      WatchTowerLogger.error("Error occurred launching Discord bot", e);
      reject(e);
    });
  });

export const restDiscordClient = new REST({ version: "10" }).setToken(
  config.DISCORD_BOT_TOKEN
);
