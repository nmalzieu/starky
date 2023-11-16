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
      .setDescription("Add a starky configuration to this server")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription(
            "What role do you want to assign to people matching your criteria?"
          )
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("starky-delete-config")
      .setDescription("Delete a Starky configuration from this server"),
    new SlashCommandBuilder()
      .setName("starky-refresh")
      .setDescription("Refresh your Starky roles on this server"),
    new SlashCommandBuilder()
      .setName("starky-view-config")
      .setDescription("View your Starky configurations on this server")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role of the configuration you want to check.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("starky-debug-user")
      .setDescription("Debug a user on this server")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to debug.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("starky-set-config-custom-api")
      .setDescription(
        "Set a custom API URI for a configuration (Instead of Starkscan)"
      ),
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
