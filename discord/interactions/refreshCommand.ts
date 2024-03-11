import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";

import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";
import { refreshDiscordMemberForAllConfigs } from "../../utils/discord/refreshRoles";

export const otherNetwork = (network: string) => {
  if (network == "goerli") {
    return "mainnet";
  }
  if (network == "mainnet") {
    return "goerli";
  }
};
export const handleRefreshCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client<boolean>,
  restClient: REST
) => {
  // Check
  if (!interaction.member) return;
  const guildId = interaction.guildId;
  const userId = interaction.member?.user?.id;
  if (!guildId || !userId) {
    await interaction.reply({ content: "An error occured", ephemeral: true });
    return;
  }
  const discordConfigs = await DiscordServerConfigRepository.findBy({
    discordServerId: interaction.guildId as string,
  });
  if (!discordConfigs.length) {
    await interaction.reply({
      content: "This server has not been configured yet.",
      ephemeral: true,
    });
    return;
  }
  // Refresh
  await interaction.deferReply({ ephemeral: true });
  let updated = 0;
  const discordMembers = await DiscordMemberRepository.find({
    where: {
      discordServerId: guildId,
      discordMemberId: userId,
    },
  });
  for (let index = 0; index < discordMembers.length; index++) {
    const res = await refreshDiscordMemberForAllConfigs(discordMembers[index]);
    updated += res?.length || 0;
  }
  // Reply
  if (!updated) {
    await interaction.editReply({
      content:
        "You haven't connected your wallet to this server. Please connect your wallet using `/starky-connect`.",
    });
    return;
  }
  await interaction.editReply({
    content: `Successfully refreshed your roles`,
  });
};
