import { REST } from "@discordjs/rest";
import { Client, GatewayIntentBits } from "discord.js";

import config from "../config";

export const createDiscordClient = (): Promise<Client> =>
  new Promise((resolve, reject) => {
    console.log("> Connecting to Discord...");
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.once("ready", () => {
      console.log("> Discord bot launched successfully");
      resolve(client);
    });
    client.login(config.DISCORD_BOT_TOKEN).catch((e) => {
      console.error("Error occurred launching Discord bot", e);
      reject(e);
    });
  });

export const restDiscordClient = new REST({ version: "10" }).setToken(
  config.DISCORD_BOT_TOKEN
);
