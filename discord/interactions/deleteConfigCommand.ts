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
  REST,
  SelectMenuBuilder,
  SelectMenuComponentOptionData,
  SelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { assertAdmin } from "./permissions";

import { DiscordServerConfig } from "../../db/entity/DiscordServerConfig";
import {
  DiscordServerConfigRepository,
  DiscordMemberRepository,
} from "../../db";
import { getRoles, isBotRole } from "../role";
import starkyModules from "../../starkyModules";
import config from "../../config";

export const handleDeleteConfigCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  await assertAdmin(interaction);
  if (!interaction.guildId) return;

  const configurations = await DiscordServerConfigRepository.findBy({
    discordServerId: interaction.guildId,
  });
  // Showing configurations
  const options = configurations.map((config) => ({
    label: config.id.toString(),
    //.concat(config.id.toString())
    //.concat(" in server n°")
    //.concat(config.DiscordServerId),
    value: config.id.toString(),
  }));

  const row = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
    new SelectMenuBuilder()
      .setCustomId("delete-config-confirm")
      .setPlaceholder("Configurations to be deleted")
      .addOptions(...options)
  );
  await interaction.reply({
    content: "What configuration do you want to delete?",
    components: [row],
    ephemeral: true,
  });
};

export const handleDeleteConfigConfirmCommand = async (
  interaction: SelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  await assertAdmin(interaction);
  if (!interaction.guildId) return;

  const serverConfigtodelete = await DiscordServerConfigRepository.findOneBy({
    id: interaction.values[0],
  });
  if (!serverConfigtodelete) return;

  await DiscordServerConfigRepository.softRemove(serverConfigtodelete);

  await interaction.update({
    content: "This configuration was deleted",
    components: [],
  });
};
