import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Client,
  REST,
  SelectMenuBuilder,
  SelectMenuInteraction,
} from "discord.js";

import { DiscordServerConfigRepository } from "../../db";
import starkyModules from "../../starkyModules";

import { assertAdmin } from "./permissions";

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
    label: starkyModules[config.starkyModuleType].configName(
      config.starknetNetwork,
      config.starkyModuleConfig
    ),
    value: config.id.toString(),
  }));

  const row = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
    new SelectMenuBuilder()
      .setCustomId("delete-config-confirm")
      .setPlaceholder("Configurations to be deleted ")
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

  await DiscordServerConfigRepository.remove(serverConfigtodelete);

  await interaction.update({
    content: "This configuration was deleted",
    components: [],
  });
};
