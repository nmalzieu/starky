import { REST } from "@discordjs/rest";
import {
  handleBackButton,
  handleConfigCancelCommand,
  handleConfigConfirmCommand,
  handleInitialConfigCommand,
  handleModuleConfigCommand,
  handleModuleTypeConfigCommand,
  handleNetworkConfigCommand,
} from "../interactions/addConfigCommand";
import {
  handleConnectCommand,
  handleReconnectNetworkCommand,
  handleUserNetworkConfigCommand,
} from "../interactions/connectCommand";
import { handleDebugUserCommand } from "../interactions/debugUser";
import {
  handleDeleteConfigCommand,
  handleDeleteConfigConfirmCommand,
} from "../interactions/deleteConfigCommand";
import {
  handleDisconnectCommand,
  handleDisconnectConfirmCommand,
} from "../interactions/disconnectCommand";
import { handleAnalyticsCommand } from "../interactions/handleAnalyticsCommand";
import { handleHelpCommand } from "../interactions/helpCommand";
import { handleListConfigsCommand } from "../interactions/listConfigs";
import { handleRefreshCommand } from "../interactions/refreshCommand";
import {
  handleSetConfigCustomApiCommand,
  handleSetConfigCustomApiModalInput,
  handleSetConfigCustomApiNext,
  handleSetConfigCustomApiSelected,
} from "../interactions/setConfigCustomApi";
import { handleViewConfigCommand } from "../interactions/viewConfig";

import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

export type ChatInputHandler = (
  interaction: ChatInputCommandInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

export type ButtonHandler = (
  interaction: ButtonInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

export type SelectMenuHandler = (
  interaction: StringSelectMenuInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

export type ModalSubmitHandler = (
  interaction: ModalSubmitInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

export interface HandlerConfig {
  type: "chatInput" | "button" | "selectMenu" | "modalSubmit";
  identifier: string;
  handler:
    | ChatInputHandler
    | ButtonHandler
    | SelectMenuHandler
    | ModalSubmitHandler;
  matchType?: "exact" | "startsWith";
}

export type SlashCommandOption = {
  type: "role" | "user";
  name: string;
  description: string;
  required: boolean;
};

export type SlashCommandData = {
  name: string;
  description: string;
  options?: SlashCommandOption[];
};

export const interactionHandlers: HandlerConfig[] = [
  {
    type: "chatInput",
    identifier: "starky-add-config",
    handler: handleInitialConfigCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-delete-config",
    handler: handleDeleteConfigCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-connect",
    handler: handleConnectCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-disconnect",
    handler: handleDisconnectCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-refresh",
    handler: handleRefreshCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-view-config",
    handler: handleViewConfigCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-debug-user",
    handler: handleDebugUserCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-set-config-custom-api",
    handler: handleSetConfigCustomApiCommand,
  },
  {
    type: "chatInput",
    identifier: "help",
    handler: handleHelpCommand,
  },
  {
    type: "chatInput",
    identifier: "list-configs",
    handler: handleListConfigsCommand,
  },
  {
    type: "chatInput",
    identifier: "starky-analytics",
    handler: handleAnalyticsCommand,
  },
  {
    type: "selectMenu",
    identifier: "starky-config-network",
    handler: handleNetworkConfigCommand,
  },
  {
    type: "selectMenu",
    identifier: "starky-config-module-type",
    handler: handleModuleTypeConfigCommand,
  },
  {
    type: "selectMenu",
    identifier: "user-config-network",
    handler: handleUserNetworkConfigCommand,
  },
  {
    type: "selectMenu",
    identifier: "delete-config-confirm",
    handler: handleDeleteConfigConfirmCommand,
  },
  {
    type: "selectMenu",
    identifier: "set-config-custom-api-selected",
    handler: handleSetConfigCustomApiSelected,
  },
  {
    type: "modalSubmit",
    identifier: "starky-config-module-config",
    handler: handleModuleConfigCommand,
  },
  {
    type: "modalSubmit",
    identifier: "set-config-custom-api-modal",
    handler: handleSetConfigCustomApiModalInput,
  },
  {
    type: "button",
    identifier: "starcord-config-confirm",
    handler: handleConfigConfirmCommand,
  },
  {
    type: "button",
    identifier: "starcord-config-cancel",
    handler: handleConfigCancelCommand,
  },
  {
    type: "button",
    identifier: "disconnect-confirm",
    handler: handleDisconnectConfirmCommand,
  },
  {
    type: "button",
    identifier: "set-config-custom-api-next",
    handler: handleSetConfigCustomApiNext,
  },
  {
    type: "button",
    identifier: "starky-config-back-",
    handler: handleBackButton,
    matchType: "startsWith",
  },
  {
    type: "button",
    identifier: "reconnect_",
    handler: handleReconnectNetworkCommand,
    matchType: "startsWith",
  },
];

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
