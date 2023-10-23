import { REST } from "@discordjs/rest";
import { Routes, SlashCommandBuilder } from "discord.js";

import config from "../config";

export const registerSlashCommands = async () => {
  const restDiscordClient = new REST({ version: "10" }).setToken(
    config.DISCORD_BOT_TOKEN
  );

  const slashCommands = [
    new SlashCommandBuilder()
      .setName("starky-connect")
      .setDescription("Connect your Starknet wallet to this Discord server"),
    new SlashCommandBuilder()
      .setName("starky-disconnect")
      .setDescription(
        "Disconnect your Starknet wallet from this Discord server"
      ),
    new SlashCommandBuilder()
      .setName("starky-add-config")
      .setDescription("Add a starky configuration to this server"),
    new SlashCommandBuilder()
      .setName("starky-delete-config")
      .setDescription("Delete a Starky configuration from this server"),
    new SlashCommandBuilder()
      .setName("starky-refresh")
      .setDescription("Refresh your Starky roles on this server"),
  ].map((command) => command.toJSON());
  console.log("> Registering Discord slash commands...");
  await restDiscordClient.put(
    Routes.applicationCommands(config.NEXT_PUBLIC_DISCORD_CLIENT_ID),
    {
      body: slashCommands,
    }
  );
  console.log("> Registered Discord slash commands!");
};
