import { REST } from "@discordjs/rest";
import { Client } from "discord.js";

import {
  ButtonHandler,
  ChatInputHandler,
  interactionHandlers,
  ModalSubmitHandler,
  SelectMenuHandler,
} from "../commands/index";

import config from "../../config";
import WatchTowerLogger from "../../watchTower";

import {
  handleInitialConfigCommand,
  handleEditConfigButton, //  Importing the handleEditConfigButton function
} from "../interactions/addConfigCommand";

export const restClient = new REST({ version: "10" }).setToken(
  config.DISCORD_BOT_TOKEN
);

export const setupInteractions = (client: Client) => {
  client.on("interactionCreate", async (interaction) => {
    const matchingHandler = interactionHandlers.find((config) => {
      switch (config.type) {
        case "chatInput":
          return (
            interaction.isChatInputCommand() &&
            interaction.commandName === config.identifier
          );
        case "button":
          return (
            interaction.isButton() &&
            (config.matchType === "startsWith"
              ? interaction.customId.startsWith(config.identifier)
              : interaction.customId === config.identifier)
          );
        case "selectMenu":
          return (
            interaction.isStringSelectMenu() &&
            interaction.customId === config.identifier
          );
        case "modalSubmit":
          return (
            interaction.isModalSubmit() &&
            interaction.customId === config.identifier
          );
        default:
          return false;
      }
    });

    if (matchingHandler) {
      switch (matchingHandler.type) {
        case "chatInput":
          if (interaction.isChatInputCommand()) {
            return (matchingHandler.handler as ChatInputHandler)(
              interaction,
              client,
              restClient
            );
          }
          break;
        case "button":
          if (interaction.isButton()) {
            return (matchingHandler.handler as ButtonHandler)(
              interaction,
              client,
              restClient
            );
          }
          break;
        case "selectMenu":
          if (interaction.isStringSelectMenu()) {
            return (matchingHandler.handler as SelectMenuHandler)(
              interaction,
              client,
              restClient
            );
          }
          break;
        case "modalSubmit":
          if (interaction.isModalSubmit()) {
            return (matchingHandler.handler as ModalSubmitHandler)(
              interaction,
              client,
              restClient
            );
          }
          break;
      }
    }

    // Handle specific interactions
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-config"
    ) {
      return handleInitialConfigCommand(interaction, client, restClient); // Handles initial configuration
    }

    if (interaction.isButton()) {
      if (interaction.customId === "starky-config-edit") {
        //  Handle "Edit Configuration" button
        return handleEditConfigButton(interaction, client, restClient); // Use the handleEditConfigButton function
      }
    }

    if (interaction.isRepliable()) {
      await interaction.reply({
        content: "This interaction couldn't be processed.",
        ephemeral: true,
      });
    }
  });

  WatchTowerLogger.info("> Discord interactions set up successfully");
};
