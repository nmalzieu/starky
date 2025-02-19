import { REST } from "@discordjs/rest";
import { Routes, SlashCommandBuilder } from "discord.js";

import config from "../config";
import WatchTowerLogger from "../watchTower";

type SlashCommandOption = {
  type: "role" | "user";
  name: string;
  description: string;
  required: boolean;
};

type SlashCommandData = {
  name: string;
  description: string;
  options?: SlashCommandOption[];
};

export const slashCommandsArray: SlashCommandData[] = [
  {
    name: "starky-connect",
    description: "Connect your Starknet wallet to this Discord server",
  },
  {
    name: "starky-disconnect",
    description: "Disconnect your Starknet wallet from this Discord server",
  },
  {
    name: "starky-add-config",
    description: "Add a starky configuration to this server",
    options: [
      {
        type: "role",
        name: "role",
        description:
          "What role do you want to assign to people matching your criteria?",
        required: true,
      },
    ],
  },
  {
    name: "starky-delete-config",
    description: "Delete a Starky configuration from this server",
  },
  {
    name: "starky-refresh",
    description: "Refresh your Starky roles on this server",
  },
  {
    name: "starky-view-config",
    description: "View your Starky configurations on this server",
    options: [
      {
        type: "role",
        name: "role",
        description: "The role of the configuration you want to check.",
        required: true,
      },
    ],
  },
  {
    name: "starky-debug-user",
    description: "Debug a user on this server",
    options: [
      {
        type: "user",
        name: "user",
        description: "The user you want to debug.",
        required: true,
      },
    ],
  },
  {
    name: "starky-set-config-custom-api",
    description:
      "Set a custom API URI for a configuration (Instead of Starkscan)",
  },
  { name: "help", description: "Get help with Starky" },
  {
    name: "list-configs",
    description: "View your Starky configurations on this server",
  },
  {
    name: "starky-analytics",
    description: "View analytics for this server",
  },
];

const buildSlashCommand = (
  commandData: SlashCommandData
): SlashCommandBuilder => {
  const command = new SlashCommandBuilder()
    .setName(commandData.name)
    .setDescription(commandData.description);
  commandData.options?.forEach((option) => {
    if (option.type === "role") {
      command.addRoleOption((opt) =>
        opt
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(option.required)
      );
    } else if (option.type === "user") {
      command.addUserOption((opt) =>
        opt
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(option.required)
      );
    }
  });
  return command;
};

export const registerSlashCommands = async (): Promise<void> => {
  const restDiscordClient = new REST({ version: "10" }).setToken(
    config.DISCORD_BOT_TOKEN
  );

  const slashCommands = slashCommandsArray
    .map(buildSlashCommand)
    .map((cmd) => cmd.toJSON());

  WatchTowerLogger.info("> Registering Discord slash commands...");
  const res = await restDiscordClient.put(
    Routes.applicationCommands(config.NEXT_PUBLIC_DISCORD_CLIENT_ID),
    { body: slashCommands }
  );
  WatchTowerLogger.info("> Registered Discord slash commands!");
};
