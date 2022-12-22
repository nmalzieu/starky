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
  handleRoleConfigCommand,
} from "./addConfigCommand";
import {
  handleConnectCommand,
  handleUserNetworkConfigCommand,
} from "./connectCommand";
import {
  handleDeleteConfigCommand,
  handleDeleteConfigConfirmCommand,
} from "./deleteConfigCommand";
import {
  handleDisconnectCommand,
  handleDisconnectConfirmCommand,
} from "./disconnectCommand";

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
      interaction.isSelectMenu() &&
      interaction.customId === "starky-config-network";

    const isRoleConfig =
      interaction.isSelectMenu() &&
      interaction.customId === "starky-config-role";

    const isModuleTypeConfig =
      interaction.isSelectMenu() &&
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
      interaction.isSelectMenu() &&
      interaction.customId === "user-config-network";

    const isUserDisonnect =
      interaction.isChatInputCommand() &&
      interaction.commandName === "starky-disconnect";

    const isUserDisconnectConfirm =
      interaction.isButton() && interaction.customId === "disconnect-confirm";

    const isUserDeleteConfigConfirm =
      interaction.isSelectMenu() &&
      interaction.customId === "delete-config-confirm";

    if (isUserConnect) {
      return handleConnectCommand(interaction, client, restClient);
    } else if (isUserNetworkConfig) {
      return handleUserNetworkConfigCommand(interaction, client, restClient);
    } else if (isInitialConfig) {
      return handleInitialConfigCommand(interaction, client, restClient);
    } else if (isDeleteConfig) {
      return handleDeleteConfigCommand(interaction, client, restClient);
    } else if (isNetworkConfig) {
      return handleNetworkConfigCommand(interaction, client, restClient);
    } else if (isRoleConfig) {
      return handleRoleConfigCommand(interaction, client, restClient);
    } else if (isModuleTypeConfig) {
      return handleModuleTypeConfigCommand(interaction, client, restClient);
    } else if (isModuleConfig) {
      return handleModuleConfigCommand(interaction, client, restClient);
    } else if (isConfigCancel) {
      return handleConfigCancelCommand(interaction, client, restClient);
    } else if (isConfigConfirm) {
      return handleConfigConfirmCommand(interaction, client, restClient);
    } else if (isUserDisonnect) {
      return handleDisconnectCommand(interaction, client, restClient);
    } else if (isUserDisconnectConfirm) {
      return handleDisconnectConfirmCommand(interaction, client, restClient);
    } else if (isUserDeleteConfigConfirm) {
      return handleDeleteConfigConfirmCommand(interaction, client, restClient);
    }
  });

  console.log("> Discord interactions set up successfully");
};
