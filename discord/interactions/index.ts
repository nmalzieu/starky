import { REST } from "@discordjs/rest";
import { Client } from "discord.js";

import config from "../../config";

import {
  handleConfigCancelCommand,
  handleConfigConfirmCommand,
  handleInitialConfigCommand,
  handleModuleConfigCommand,
  handleModuleTypeConfigCommand,
  handleNetworkConfigCommand,
} from "./addConfigCommand";
import {
  handleConnectCommand,
  handleUserNetworkConfigCommand,
} from "./connectCommand";
import { handleDebugUserCommand } from "./debugUser";
import {
  handleDeleteConfigCommand,
  handleDeleteConfigConfirmCommand,
} from "./deleteConfigCommand";
import {
  handleDisconnectCommand,
  handleDisconnectConfirmCommand,
} from "./disconnectCommand";
import { handleRefreshCommand } from "./refreshCommand";
import {
  handleSetConfigCustomApiCommand,
  handleSetConfigCustomApiModalInput,
  handleSetConfigCustomApiNext,
  handleSetConfigCustomApiSelected,
} from "./setConfigCustomApi";
import { handleViewConfigCommand } from "./viewConfig";

export const restClient = new REST({ version: "10" }).setToken(
  config.DISCORD_BOT_TOKEN
);

export const setupInteractions = (client: Client) => {
  client.on("interactionCreate", async (interaction) => {
    const isInitialConfig =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-add-config";

    const isDeleteConfig =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-delete-config";

    const isNetworkConfig =
      interaction.isStringSelectMenu() &&
      interaction.customId === "starky-config-network";

    const isModuleTypeConfig =
      interaction.isStringSelectMenu() &&
      interaction.customId === "starky-config-module-type";

    const isModuleConfig =
      interaction.isModalSubmit() &&
      interaction.customId === "starky-config-module-config";

    const isConfigConfirm =
      interaction.isButton() &&
      interaction.customId === "starcord-config-confirm";

    const isConfigCancel =
      interaction.isButton() &&
      interaction.customId === "starcord-config-cancel";

    const isUserConnect =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-connect";

    const isUserNetworkConfig =
      interaction.isStringSelectMenu() &&
      interaction.customId === "user-config-network";

    const isUserDisonnect =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-disconnect";

    const isUserDisconnectConfirm =
      interaction.isButton() && interaction.customId === "disconnect-confirm";

    const isUserDeleteConfigConfirm =
      interaction.isStringSelectMenu() &&
      interaction.customId === "delete-config-confirm";

    const isRefreshCommand =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-refresh";

    const isViewConfigCommand =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-view-config";

    const isDebugUserCommand =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-debug-user";

    const isSetConfigCustomApiCommand =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-set-config-custom-api";

    const isSetConfigCustomApiSelected =
      interaction.isStringSelectMenu() &&
      interaction.customId === "set-config-custom-api-selected";

    const isSetConfigCustomApiNext =
      interaction.isButton() &&
      interaction.customId === "set-config-custom-api-next";

    const isSetConfigCustomApiModalInput =
      interaction.isModalSubmit() &&
      interaction.customId === "set-config-custom-api-modal";

    if (isUserConnect)
      return handleConnectCommand(interaction, client, restClient);
    else if (isUserNetworkConfig)
      return handleUserNetworkConfigCommand(interaction, client, restClient);
    else if (isInitialConfig)
      return handleInitialConfigCommand(interaction, client, restClient);
    else if (isDeleteConfig)
      return handleDeleteConfigCommand(interaction, client, restClient);
    else if (isNetworkConfig)
      return handleNetworkConfigCommand(interaction, client, restClient);
    else if (isModuleTypeConfig)
      return handleModuleTypeConfigCommand(interaction, client, restClient);
    else if (isModuleConfig)
      return handleModuleConfigCommand(interaction, client, restClient);
    else if (isConfigCancel)
      return handleConfigCancelCommand(interaction, client, restClient);
    else if (isConfigConfirm)
      return handleConfigConfirmCommand(interaction, client, restClient);
    else if (isUserDisonnect)
      return handleDisconnectCommand(interaction, client, restClient);
    else if (isUserDisconnectConfirm)
      return handleDisconnectConfirmCommand(interaction, client, restClient);
    else if (isUserDeleteConfigConfirm)
      return handleDeleteConfigConfirmCommand(interaction, client, restClient);
    else if (isRefreshCommand)
      return handleRefreshCommand(interaction, client, restClient);
    else if (isViewConfigCommand)
      return handleViewConfigCommand(interaction, client, restClient);
    else if (isDebugUserCommand)
      return handleDebugUserCommand(interaction, client, restClient);
    else if (isSetConfigCustomApiCommand)
      return handleSetConfigCustomApiCommand(interaction, client, restClient);
    else if (isSetConfigCustomApiSelected)
      return handleSetConfigCustomApiSelected(interaction, client, restClient);
    else if (isSetConfigCustomApiNext)
      return handleSetConfigCustomApiNext(interaction, client, restClient);
    else if (isSetConfigCustomApiModalInput)
      return handleSetConfigCustomApiModalInput(
        interaction,
        client,
        restClient
      );
  });

  console.log("> Discord interactions set up successfully");
};
