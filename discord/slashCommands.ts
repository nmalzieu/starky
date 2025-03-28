import { REST } from "@discordjs/rest";
import { Routes, SlashCommandBuilder } from "discord.js";

import config from "../config";
import WatchTowerLogger from "../watchTower";
import { slashCommandsArray, SlashCommandData } from "./commands/index";

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
