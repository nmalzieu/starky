import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Client,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";

import { DiscordServerConfigRepository } from "../../db";
import { assertManageRoles } from "../../utils/discord/permissions";
import { getRoleName } from "../role";

export const handleDeleteConfigCommand = async (
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
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
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
