import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import {
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "../../db";
import { DiscordServer } from "../../db/entity/DiscordServer";
import { DiscordServerConfig } from "../../db/entity/DiscordServerConfig";
import starkyModules from "../../starkyModules";
import { NetworkName } from "../../types/starknet";
import { assertManageRoles } from "../../utils/discord/permissions";
import { getRoles, isBotRole } from "../role";

type ConfigStep = "role" | "network" | "module" | "module-config" | "summary";

type OngoingConfiguration = {
  currentStep: ConfigStep;
  network?: NetworkName;
  roleId?: string;
  moduleType?: string;
  moduleConfig?: any;
  existingConfigId?: string;
};

const ongoingConfigurationsCache: Record<string, OngoingConfiguration> = {};

const CONFIG_STEPS = {
  ROLE: "role",
  NETWORK: "network",
  MODULE: "module",
  MODULE_CONFIG: "module-config",
  SUMMARY: "summary",
} as const;

const NETWORK_OPTIONS = [
  {
    label: "Sepolia",
    description: "The Sepolia Starknet testnet",
    value: "sepolia",
  },
  {
    label: "Mainnet",
    description: "The Starknet mainnet",
    value: "mainnet",
  },
] as const;

const SUPPORTED_NETWORKS = ["mainnet", "sepolia"] as const;

export const handleBackButton = (previousStepId: string) => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`starky-config-back-${previousStepId}`)
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );
};

export const handleInitialConfigCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  ongoingConfigurationsCache[interaction.guildId] = {
    currentStep: "role",
  };

  const selectedRole = interaction.options.getRole("role");
  const roles = await getRoles(restClient, interaction.guildId);
  const botRole = roles.find((role) => isBotRole(role));

  if (!botRole || !selectedRole) return;

  if (botRole.position <= selectedRole.position) {
    delete ongoingConfigurationsCache[interaction.guildId];
    await interaction.reply({
      content: `❌ You have selected a role that the bot cannot control. Please place the role \`${botRole.name}\` above the role \`${selectedRole.name}\` in Server Settings > Roles and try again.`,
      components: [],
      ephemeral: true,
    });
    return;
  }

  const alreadyDiscordServerConfigForRole =
    await DiscordServerConfigRepository.findOneBy({
      discordServerId: interaction.guildId,
      discordRoleId: selectedRole.id,
    });

  if (alreadyDiscordServerConfigForRole) {
    const editConfigButton =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`starky-config-edit-${alreadyDiscordServerConfigForRole.id}`)
          .setLabel("Edit Configuration")
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({
      content: `⚠️ A configuration for this role already exists. You can edit it instead of creating a new one.`,
      components: [editConfigButton],
      ephemeral: true,
    });
    return;
  }

  ongoingConfigurationsCache[interaction.guildId].roleId = selectedRole.id;
  ongoingConfigurationsCache[interaction.guildId].currentStep =
    CONFIG_STEPS.NETWORK;

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("starky-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(
          NETWORK_OPTIONS.map((option) => ({
            ...option,
            default:
              option.value ===
              ongoingConfigurationsCache[interaction.guildId!].network,
          }))
        )
    );

  const backRow = handleBackButton(CONFIG_STEPS.NETWORK);

  await interaction.reply({
    content: `Current network: ${
      ongoingConfigurationsCache[interaction.guildId!].network || "Not set"
    }\nOn what Starknet network do you want to set up Starky?`,
    components: [selectRow, backRow],
    ephemeral: true,
  });
};

export const handleEditConfigButton = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const configId = interaction.customId.replace("starky-config-edit-", "");
  const existingConfig = await DiscordServerConfigRepository.findOne({
    where: { id: configId },
  });

  if (!existingConfig) {
    await interaction.reply({
      content: "❌ Configuration not found.",
      ephemeral: true,
    });
    return;
  }

  ongoingConfigurationsCache[interaction.guildId!] = {
    currentStep: "network",
    network: existingConfig.starknetNetwork,
    roleId: existingConfig.discordRoleId,
    moduleType: existingConfig.starkyModuleType,
    moduleConfig: existingConfig.starkyModuleConfig,
    existingConfigId: configId,
  };

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("starky-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(
          NETWORK_OPTIONS.map((option) => ({
            ...option,
            default:
              option.value ===
              ongoingConfigurationsCache[interaction.guildId!].network,
          }))
        )
    );

  const backRow = handleBackButton(CONFIG_STEPS.NETWORK);

  await interaction.update({
    content: `Current network: ${existingConfig.starknetNetwork}\nOn what Starknet network do you want to set up Starky?`,
    components: [selectRow, backRow],
  });
};

export const handleNetworkConfigCommand = async (
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const network = interaction.values[0] as "mainnet" | "sepolia";
  if (network !== "mainnet" && network !== "sepolia") return;

  ongoingConfigurationsCache[interaction.guildId!].network = network;
  ongoingConfigurationsCache[interaction.guildId!].currentStep =
    CONFIG_STEPS.MODULE;

  await interaction.update({
    content: "Thanks, following up...",
    components: [],
  });

  const modulesOptions: SelectMenuComponentOptionData[] = [];
  for (const starkyModuleId in starkyModules) {
    const starkyModule = starkyModules[starkyModuleId];
    modulesOptions.push({
      label: starkyModule.name,
      value: starkyModuleId,
    });
  }

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("starky-config-module-type")
        .setPlaceholder("Starky module to use")
        .addOptions(
          modulesOptions.map((option) => ({
            ...option,
            default:
              option.value ===
              ongoingConfigurationsCache[interaction.guildId!].moduleType,
          }))
        )
    );

  const backRow = handleBackButton(CONFIG_STEPS.MODULE);

  await interaction.followUp({
    content: "What Starky module do you want to use?",
    components: [selectRow, backRow],
    ephemeral: true,
  });
};

export const handleModuleTypeConfigCommand = async (
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const starkyModuleId = interaction.values[0];
  ongoingConfigurationsCache[interaction.guildId!].moduleType = starkyModuleId;
  ongoingConfigurationsCache[interaction.guildId!].currentStep =
    CONFIG_STEPS.MODULE_CONFIG;
  const starkyModule = starkyModules[starkyModuleId];
  if (!starkyModule) return;

  if (starkyModule.fields.length === 0) {
    await interaction.deferUpdate();
    ongoingConfigurationsCache[interaction.guildId!].currentStep =
      CONFIG_STEPS.SUMMARY;
    const backRow = handleBackButton(CONFIG_STEPS.MODULE_CONFIG);
    await interaction.editReply({
      content: "Thanks, preparing summary...",
      components: [backRow],
    });
    await finishUpConfiguration(interaction, client, restClient);
    return;
  }

  const currentConfig = ongoingConfigurationsCache[interaction.guildId!];
  const modal = new ModalBuilder()
    .setCustomId("starky-config-module-config")
    .setTitle(`Configure the ${starkyModule.name} Starky module`);
  const rows = starkyModule.fields.map((moduleField) =>
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(moduleField.id)
        .setLabel(moduleField.question)
        .setStyle(
          moduleField.textarea ? TextInputStyle.Paragraph : TextInputStyle.Short
        )
        .setValue(currentConfig.moduleConfig?.[moduleField.id] || "")
        .setPlaceholder(moduleField.placeholder || "")
    )
  );
  modal.addComponents(...rows);

  const backRow = handleBackButton(CONFIG_STEPS.MODULE_CONFIG);

  await interaction.showModal(modal);
  await interaction.editReply({
    content: "Thanks, following up... Click the button to reselect Module",
    components: [backRow],
  });
};

export const handleModuleConfigCommand = async (
  interaction: ModalSubmitInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const moduleConfig: any = {};
  interaction.fields.fields.forEach(
    (fieldValue) => (moduleConfig[fieldValue.customId] = fieldValue.value)
  );

  const currentConfig = ongoingConfigurationsCache[interaction.guildId!];
  ongoingConfigurationsCache[interaction.guildId!].currentStep =
    CONFIG_STEPS.SUMMARY;
  currentConfig.moduleConfig = moduleConfig;

  await finishUpConfiguration(interaction, client, restClient);
};

export const finishUpConfiguration = async (
  interaction: ModalSubmitInteraction | StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const currentConfig = ongoingConfigurationsCache[interaction.guildId!];
  if (!currentConfig) {
    await interaction.reply({
      content: "❌ Configuration session expired. Please start over.",
      ephemeral: true,
    });
    return;
  }

  if (
    !SUPPORTED_NETWORKS.includes(
      currentConfig.network as typeof SUPPORTED_NETWORKS[number]
    )
  ) {
    await interaction.reply(
      `❌ Unsupported network. Valid: ${SUPPORTED_NETWORKS.join(", ")}`
    );
    return;
  }

  const role = (await getRoles(restClient, interaction.guildId)).find(
    (r) => r.id === currentConfig.roleId
  );

  let summaryContent = `Thanks for configuring Starky 🎉\n\nHere is a summary of your configuration:\n\n__Starknet network:__ \`${
    currentConfig.network
  }\`\n__Discord role to assign:__ \`${role?.name}\`\n__Starky module:__ \`${
    currentConfig.moduleType
  }\`${currentConfig.moduleConfig ? "\n\nModule specific settings:\n" : ""}`;
  for (const fieldId in currentConfig.moduleConfig) {
    summaryContent = `${summaryContent}\n${fieldId}: \`${
      currentConfig.moduleConfig[fieldId]
    }\``;
  }
  summaryContent = `${summaryContent}\n\n**Do you want to save this configuration?**`;

  const actionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("starky-config-cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("starky-config-confirm")
      .setLabel("Save configuration")
      .setStyle(ButtonStyle.Primary)
  );

  const backRow = handleBackButton(CONFIG_STEPS.MODULE_CONFIG);

  if (interaction.replied) {
    await interaction.editReply({
      content: summaryContent,
      components: [actionsRow, backRow],
    });
  } else {
    await interaction.reply({
      content: summaryContent,
      components: [actionsRow, backRow],
      ephemeral: true,
    });
  }
};

export const handleConfigCancelCommand = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  delete ongoingConfigurationsCache[interaction.guildId];

  await interaction.update({
    content: "❌ Starky configuration aborted.",
    components: [],
  });
};

export const handleConfigConfirmCommand = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const currentConfig = ongoingConfigurationsCache[interaction.guildId!];
  
  await interaction.deferUpdate();

  const queryRunner =
    DiscordServerConfigRepository.manager.connection.createQueryRunner();
  await queryRunner.startTransaction();
  try {
    const alreadyDiscordServerConfig =
      await DiscordServerConfigRepository.findOneBy({
        discordServerId: interaction.guildId,
        starkyModuleConfig: currentConfig.moduleConfig,
        discordRoleId: currentConfig.roleId,
        starknetNetwork: currentConfig.network,
      });

    const alreadyDiscordServer = await DiscordServerRepository.findOneBy({
      id: interaction.guildId,
    });

    const discordServerConfig =
      alreadyDiscordServerConfig || new DiscordServerConfig();

    const discordServer = alreadyDiscordServer || new DiscordServer();
    discordServer.id = interaction.guildId;

    discordServerConfig.discordServerId = interaction.guildId;
    if (
      currentConfig.network !== "mainnet" &&
      currentConfig.network !== "sepolia"
    ) {
      throw new Error("Wrong network config");
    }
    discordServerConfig.starknetNetwork = currentConfig.network;
    if (!currentConfig.roleId) {
      throw new Error("Wrong role config");
    }
    discordServerConfig.discordRoleId = currentConfig.roleId;
    if (
      !currentConfig.moduleType ||
      !(currentConfig.moduleType in starkyModules)
    ) {
      throw new Error("Wrong module config");
    }
    discordServerConfig.starkyModuleType = currentConfig.moduleType;

    discordServerConfig.starkyModuleConfig = currentConfig.moduleConfig || {};

    await DiscordServerRepository.save(discordServer);
    await DiscordServerConfigRepository.save(discordServerConfig);
    await queryRunner.commitTransaction();
    
    await interaction.editReply({
      content: "✅ Thanks, your Starky configuration is now done.",
      components: [],
    });
  } catch (error) {
    await interaction.editReply({
      content: "❌ Error saving configuration. Please try again.",
      components: [],
    });
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    delete ongoingConfigurationsCache[interaction.guildId!];
  }
};