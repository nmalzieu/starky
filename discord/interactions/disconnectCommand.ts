import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  REST,
} from "discord.js";

import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";
import { removeRole } from "../role";

export const handleDisconnectConfirmCommand = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  const userId = interaction.member?.user?.id;
  const userRoles = interaction.member?.roles;
  const guildId = interaction.guildId;
  if (!userId || !guildId) return;
  const alreadyDiscordMember = await DiscordMemberRepository.find({
    where: {
      discordMemberId: userId,
      discordServerId: guildId,
    },
    relations: ["discordServer"],
  });
  if (!alreadyDiscordMember) return;

  const serverConfigs = await DiscordServerConfigRepository.find({
    where: {
      discordServerId: guildId,
    },
    relations: ["discordServer"],
  });

  await DiscordMemberRepository.softRemove(alreadyDiscordMember);

  for (let serverConfig of serverConfigs) {
    removeRole(restClient, guildId, userId, serverConfig.discordRoleId);
  }

  await interaction.update({
    content: "Disconnected!",
    components: [],
  });
};

export const handleDisconnectCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  const userId = interaction.member?.user?.id;
  const guildId = interaction.guildId;
  if (!userId || !guildId) return;
  const alreadyDiscordMember = await DiscordMemberRepository.findOneBy({
    discordMemberId: userId,
    discordServerId: guildId,
  });
  if (!alreadyDiscordMember) {
    await interaction.reply({
      content: "You haven't linked any Starknet wallet to this Discord server.",
      ephemeral: true,
    });
    return;
  }
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("disconnect-confirm")
      .setLabel("Disconnect")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({
    content:
      "Do you really want to disconnect from your Starknet wallet? You will lose your Starknet-related role.",
    components: [row],
    ephemeral: true,
  });
};
