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
};

type OngoingConfigurationsCache = {
  [guildId: string]: OngoingConfiguration;
};

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

const ongoingConfigurationsCache: OngoingConfigurationsCache = {};

const addBackButton = (previousStepId: string) => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`starky-config-back-${previousStepId}`)
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );
};

export const handleBackButton = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const config = ongoingConfigurationsCache[interaction.guildId];
  if (!config) {
    await interaction.reply({
      content:
        "❌ Invalid configuration state. Please start over with /starky-config.",
      ephemeral: true,
    });
    return;
  }

  const step = interaction.customId.replace("starky-config-back-", "");

  switch (step) {
    case CONFIG_STEPS.NETWORK:
      config.currentStep = "role";
      await handleBackToRole(interaction, client, restClient);
      break;
    case CONFIG_STEPS.MODULE:
      config.currentStep = "network";
      await handleBackToNetwork(interaction, client, restClient);
      break;

    case CONFIG_STEPS.MODULE_CONFIG:
      config.currentStep = "module";
      await handleBackToModule(interaction, client, restClient);
      break;
  }
};

const handleBackToRole = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  await interaction.update({
    content:
      "❌ Configuration cancelled. Please start over with /starky-config command and select a role.",
    components: [],
  });
  delete ongoingConfigurationsCache[interaction.guildId!];
};

const handleBackToNetwork = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("starky-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(...NETWORK_OPTIONS)
    );

  const backRow = addBackButton("network");

  await interaction.update({
    content: "On what Starknet network do you want to set up Starky?",
    components: [selectRow, backRow],
  });
};

const handleBackToModule = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
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
        .addOptions(...modulesOptions)
    );

  const backRow = addBackButton("module");

  await interaction.update({
    content: "What Starky module do you want to use?",
    components: [selectRow, backRow],
  });
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

  ongoingConfigurationsCache[interaction.guildId].roleId = selectedRole.id;
  ongoingConfigurationsCache[interaction.guildId].currentStep =
    CONFIG_STEPS.NETWORK;

  if (alreadyDiscordServerConfigForRole) {
    const editConfigButton =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("starky-config-edit")
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

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("starky-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(...NETWORK_OPTIONS)
    );

  const backRow = addBackButton(CONFIG_STEPS.NETWORK);

  await interaction.reply({
    content: "On what Starknet network do you want to set up Starky?",
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

  if (!interaction.guildId) {
    await interaction.reply({
      content: "❌ This interaction must be used in a server.",
      ephemeral: true,
    });
    return;
  }
  const currentConfig = ongoingConfigurationsCache[interaction.guildId];
  if (!currentConfig) return;
  const roleId = currentConfig.roleId;

  try {
    // Retrieve the configuration for the role
    const existingConfig = await DiscordServerConfigRepository.findOneBy({
      discordServerId: interaction.guildId,
      discordRoleId: roleId,
    });

    if (!existingConfig) {
      await interaction.reply({
        content: "❌ No existing configuration found for this role",
        ephemeral: true,
      });
      return;
    }

    // Create a modal for editing the configuration
    const modal = new ModalBuilder()
      .setCustomId(`starky-config-edit-modal-${roleId}`)
      .setTitle("Edit Configuration");

    // Create input fields for the modal
    const networkInput = new TextInputBuilder()
      .setCustomId("edit-network")
      .setLabel("Network")
      .setStyle(TextInputStyle.Short)
      .setValue(existingConfig.starknetNetwork || "")
      .setRequired(true);

    const roleInput = new TextInputBuilder()
      .setCustomId("edit-role")
      .setLabel("Discord Role ID")
      .setStyle(TextInputStyle.Short)
      .setValue(existingConfig.discordRoleId || "")
      .setRequired(true);

    const moduleTypeInput = new TextInputBuilder()
      .setCustomId("edit-module-type")
      .setLabel("Module Type")
      .setStyle(TextInputStyle.Short)
      .setValue(existingConfig.starkyModuleType || "")
      .setRequired(true);

    const moduleConfigInput = new TextInputBuilder()
      .setCustomId("edit-module-config")
      .setLabel("Module Config (JSON)")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(
        JSON.stringify(existingConfig.starkyModuleConfig || {}, null, 2)
      )
      .setRequired(false);

    // Add input fields to the modal
    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        networkInput
      ),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        roleInput
      ),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        moduleTypeInput
      ),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        moduleConfigInput
      )
    );

    // Show the modal to the user
    await interaction.showModal(modal);
  } catch (error) {
    console.error("Error showing edit modal:", error);
    await interaction.reply({
      content: "❌ An error occurred while preparing the edit form",
      ephemeral: true,
    });
  }
};

// Added this function to handle the edit modal submission
export const handleEditModalSubmit = async (
  interaction: ModalSubmitInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);

  if (!interaction.guildId) {
    await interaction.reply({
      content: "❌ This interaction must be used in a server.",
      ephemeral: true,
    });
    return;
  }
  const existingConfig = ongoingConfigurationsCache[interaction.guildId];
  const roleId = existingConfig.roleId;

  try {
    // Get values from the modal
    const network = interaction.fields.getTextInputValue("edit-network");
    const role = interaction.fields.getTextInputValue("edit-role");
    const moduleType = interaction.fields.getTextInputValue("edit-module-type");
    const moduleConfigJson =
      interaction.fields.getTextInputValue("edit-module-config");

    // Parse the module config JSON
    let moduleConfig;
    console.log(moduleConfigJson);
    try {
      moduleConfig = JSON.parse(moduleConfigJson);
    } catch (error) {
      console.error("Invalid JSON in module config:", error);
      await interaction.reply({
        content:
          "❌ Invalid JSON in module config. Please check your formatting.",
        ephemeral: true,
      });
      return;
    }

    // Validate the network
    if (network !== "mainnet" && network !== "sepolia") {
      await interaction.reply({
        content: "❌ Invalid network. Must be 'mainnet' or 'sepolia'.",
        ephemeral: true,
      });
      return;
    }

    // Validate the module type
    if (!(moduleType in starkyModules)) {
      await interaction.reply({
        content: `❌ Invalid module type. Available modules: ${Object.keys(
          starkyModules
        ).join(", ")}`,
        ephemeral: true,
      });
      return;
    }

    // Get the existing config
    const existingConfig = await DiscordServerConfigRepository.findOneBy({
      discordServerId: interaction.guildId,
      discordRoleId: roleId,
    });

    if (!existingConfig) {
      await interaction.reply({
        content: "❌ No existing configuration found for this role.",
        ephemeral: true,
      });
      return;
    }

    // Update the config
    existingConfig.starknetNetwork = network as NetworkName;
    existingConfig.discordRoleId = role;
    existingConfig.starkyModuleType = moduleType;
    existingConfig.starkyModuleConfig = moduleConfig;

    // Save the updated config
    await DiscordServerConfigRepository.save(existingConfig);

    await interaction.reply({
      content: "✅ Configuration updated successfully!",
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error updating configuration:", error);
    await interaction.reply({
      content: "❌ An error occurred while updating the configuration.",
      ephemeral: true,
    });
  }
};
export const handleNetworkConfigCommand = async (
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;
  const network = interaction.values[0];
  if (network !== "mainnet" && network !== "sepolia") return;

  ongoingConfigurationsCache[interaction.guildId].network = network;
  ongoingConfigurationsCache[interaction.guildId].currentStep =
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
        .addOptions(...modulesOptions)
    );

  const backRow = addBackButton(CONFIG_STEPS.MODULE);

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
  ongoingConfigurationsCache[interaction.guildId].moduleType = starkyModuleId;
  ongoingConfigurationsCache[interaction.guildId].currentStep =
    CONFIG_STEPS.MODULE_CONFIG;
  const starkyModule = starkyModules[starkyModuleId];
  if (!starkyModule) return;

  if (starkyModule.fields.length === 0) {
    ongoingConfigurationsCache[interaction.guildId].currentStep =
      CONFIG_STEPS.SUMMARY;
    const backRow = addBackButton(CONFIG_STEPS.MODULE_CONFIG);
    await interaction.update({
      content: "Thanks, preparing summary...",
      components: [backRow],
    });
    await finishUpConfiguration(interaction, client, restClient);
    return;
  }

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
        .setPlaceholder(moduleField.placeholder ? moduleField.placeholder : "")
    )
  );
  modal.addComponents(...rows);

  const backRow = addBackButton(CONFIG_STEPS.MODULE_CONFIG);

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

  const currentConfig = ongoingConfigurationsCache[interaction.guildId];
  ongoingConfigurationsCache[interaction.guildId].currentStep =
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

  const currentConfig = ongoingConfigurationsCache[interaction.guildId];
  const role = (await getRoles(restClient, interaction.guildId)).find(
    (r) => r.id === currentConfig.roleId
  );

  let summaryContent = `Thanks for configuring Starky 🎉\n\nHere is a summary of your configuration:\n\n__Starknet network:__ \`${
    currentConfig.network
  }\`\n__Discord role to assign:__ \`${role?.name}\`\n__Starky module:__ \`${
    currentConfig.moduleType
  }\`${currentConfig.moduleConfig ? "\n\nModule specific settings:\n" : ""}`;
  for (const fieldId in currentConfig.moduleConfig) {
    summaryContent = `${summaryContent}\n${fieldId}: \`${currentConfig.moduleConfig[fieldId]}\``;
  }
  summaryContent = `${summaryContent}\n\n**Do you want to save this configuration?**`;

  const actionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("starcord-config-cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("starcord-config-confirm")
      .setLabel("Save configuration")
      .setStyle(ButtonStyle.Primary)
  );

  const backRow = addBackButton(CONFIG_STEPS.MODULE_CONFIG);

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

  const currentConfig = ongoingConfigurationsCache[interaction.guildId];

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

  delete ongoingConfigurationsCache[interaction.guildId];

  await interaction.update({
    content: "✅ Thanks your Starky configuration is now done.",
    components: [],
  });
};
