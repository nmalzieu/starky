import { REST } from "@discordjs/rest";
import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

import config from "../../config";
import WatchTowerLogger from "../../watchTower";

import {
  handleBackButton,
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
import { handleAnalyticsCommand } from "./handleAnalyticsCommand";
import { handleHelpCommand } from "./helpCommand";
import { handleListConfigsCommand } from "./listConfigs";
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

type ChatInputHandler = (
  interaction: ChatInputCommandInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

type ButtonHandler = (
  interaction: ButtonInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

type SelectMenuHandler = (
  interaction: StringSelectMenuInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

type ModalSubmitHandler = (
  interaction: ModalSubmitInteraction,
  client: Client,
  rest: REST
) => Promise<void>;

interface HandlerConfig {
  type: "chatInput" | "button" | "selectMenu" | "modalSubmit";
  identifier: string;
  handler:
    | ChatInputHandler
    | ButtonHandler
    | SelectMenuHandler
    | ModalSubmitHandler;
  matchType?: "exact" | "startsWith";
}

const interactionHandlers: HandlerConfig[] = [
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
];

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

    if (interaction.isRepliable()) {
      await interaction.reply({
        content: "This interaction couldn't be processed.",
        ephemeral: true,
      });
    }
  });

  WatchTowerLogger.info("> Discord interactions set up successfully");
};
