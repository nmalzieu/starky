import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";

import { refreshDiscordMemberForAllConfigs } from "../../cron";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";

import { assertManageRoles } from "./permissions";

export const handleDebugUserCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;
  const selectedUser = interaction.options.getUser("user");
  if (!selectedUser) {
    await interaction.reply({
      content: "You need to select a user.",
      ephemeral: true,
    });
    return;
  }
  const userId = selectedUser.id;
  const guildId = interaction.guildId;
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
  type UpdatedConfig = {
    [network: string]: {
      configs: {
        shouldHaveRole: boolean | undefined;
        roleId: string;
      }[];
      walletAddress: string;
    };
  };
  const discordMembers = await DiscordMemberRepository.find({
    where: {
      discordServerId: guildId,
      discordMemberId: userId,
    },
  });
  const updatedConfigs: UpdatedConfig = {};
  for (let index = 0; index < discordMembers.length; index++) {
    const res = await refreshDiscordMemberForAllConfigs(discordMembers[index]);
    if (!res || !res.length) continue;
    updatedConfigs[discordMembers[index].starknetNetwork as string] = {
      configs: res,
      walletAddress: discordMembers[index].starknetWalletAddress as string,
    };
  }
  await interaction.followUp({
    content: `Updated configs for user ${selectedUser.username}:
${Object.entries(updatedConfigs)
  .map(
    ([network, user]) =>
      `**${network}** - ${user.walletAddress}:
${user.configs
  .map(
    (config) =>
      `- **${config.shouldHaveRole ? "Added" : "Removed"}** <@&${
        config.roleId
      }>`
  )
  .join("\n")}`
  )
  .join("\n")}`,
    ephemeral: true,
  });
};
