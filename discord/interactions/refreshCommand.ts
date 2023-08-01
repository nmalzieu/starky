import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";

import { refreshDiscordMember } from "../../cron";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";
import modules from "../../starkyModules";

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
  let updated = 0;
  for (let index = 0; index < discordConfigs.length; index++) {
    const discordConfig = discordConfigs[index];
    const discordMember = await DiscordMemberRepository.findOne({
      where: {
        discordServerId: guildId,
        discordMemberId: userId,
        starknetNetwork: discordConfig.starknetNetwork,
      },
    });
    if (discordMember) {
      updated++;
      await refreshDiscordMember(
        discordConfig,
        discordMember,
        modules[discordConfig.starkyModuleType]
      );
    }
  }
  if (!updated) {
    await interaction.reply({
      content: "You haven't connected your wallet to this server.",
      ephemeral: true,
    });
    return;
  }
  await interaction.reply({
    content: `Successfully refreshed your roles`,
    ephemeral: true,
  });
};
