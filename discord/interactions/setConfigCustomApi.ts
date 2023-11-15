import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { DiscordServerConfigRepository } from "../../db";
import { getRoleName } from "../role";

import { assertManageRoles } from "./permissions";

type OngoingConfiguration = {
  configurationId: string;
};

type OngoingConfigurationsCache = {
  [guildId: string]: OngoingConfiguration;
};

const ongoingConfigurationsCache: OngoingConfigurationsCache = {};

export const handleSetConfigCustomApiCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const configurations = await DiscordServerConfigRepository.find({
    where: {
      discordServerId: interaction.guildId,
    },
    order: { id: "ASC" },
  });
  if (configurations.length === 0) {
    await interaction.reply({
      content: "You don't have any configuration setup right now.",
      ephemeral: true,
    });
    return;
  }
  // Showing configurations
  const options: { label: string; value: string }[] = [];
  for (let config of configurations) {
    options.push({
      label: `${config.id} - ${await getRoleName(
        restClient,
        config.discordServerId,
        config.discordRoleId
      )} (${config.starkyModuleType})`.slice(0, 99),
      value: config.id.toString(),
    });
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("set-config-custom-api-selected")
      .setPlaceholder("Configurations APIs to be set")
      .addOptions(...options)
  );
  await interaction.reply({
    content: `To what configuration do you want to set a custom API URI?`,
    components: [row],
    ephemeral: true,
  });
};

export const handleSetConfigCustomApiSelected = async (
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;
  const configurationId = interaction.values[0];
  ongoingConfigurationsCache[interaction.guildId] = {
    configurationId,
  };
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("set-config-custom-api-next")
      .setLabel("Set custom API URI")
      .setStyle(ButtonStyle.Primary)
  );
  await interaction.reply({
    content: `You will be prompted for the URI in the next step.
Leave it empty to use the default API URI.
You can provide a dynamic URI by using the following variables:
- {ADDRESS_HEX} will be replaced by the address of the user in hex format.
- {ADDRESS_INT} will be replaced by the address of the user in integer format.
Example: https://api.starknet.id/addr_to_full_ids?addr={ADDRESS_INT}

You can also provide a parameter name for the assets in the API response.
Example: assets
This will be used to select the right param in the JSON API response.
Leave empty if the API response is already an array of assets, not a dictionary.`,
    components: [row],
    ephemeral: true,
  });
};

export const handleSetConfigCustomApiNext = async (
  interaction: any,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return interaction.reply("Guild ID not found.");
  const currentConfig = ongoingConfigurationsCache[interaction.guildId];
  const configurationId = currentConfig.configurationId;
  if (!configurationId) return interaction.reply("Configuration ID not found.");

  const serverConfigtoEdit = await DiscordServerConfigRepository.findOneBy({
    id: configurationId,
  });
  if (!serverConfigtoEdit)
    return interaction.reply({
      content: "Configuration not found.",
      components: [],
    });

  const modal = new ModalBuilder()
    .setCustomId("set-config-custom-api-modal")
    .setTitle(`Configure custom API URI`);
  const rows = [
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("set-config-custom-api-modal-uri")
        .setLabel("Custom API URI.")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(
          "https://api.starknet.id/addr_to_full_ids?addr={ADDRESS_INT}"
        )
        .setRequired(false)
    ),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("set-config-custom-api-modal-param-name")
        .setLabel("API assets parameter name.")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("full_ids")
        .setRequired(false)
    ),
  ];
  modal.addComponents(...rows);
  await interaction.showModal(modal);
};

export const handleSetConfigCustomApiModalInput = async (
  interaction: ModalSubmitInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;
  await interaction.deferReply({
    ephemeral: true,
  });
  const uri = interaction.fields.fields.find(
    (field) => field.customId === "set-config-custom-api-modal-uri"
  )?.value;
  const paramName = interaction.fields.fields.find(
    (field) => field.customId === "set-config-custom-api-modal-param-name"
  )?.value;

  const currentConfig = ongoingConfigurationsCache[interaction.guildId];

  const serverConfigtoEdit = await DiscordServerConfigRepository.findOneBy({
    id: currentConfig.configurationId,
  });
  if (!serverConfigtoEdit) return;

  await DiscordServerConfigRepository.update(serverConfigtoEdit, {
    starkyModuleConfig: {
      ...serverConfigtoEdit.starkyModuleConfig,
      customApiUri: uri,
      customApiParamName: paramName,
    },
  });

  await interaction.reply({
    content: "Custom API URI set.",
    components: [],
  });
};
