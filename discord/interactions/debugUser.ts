import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";

import { refreshDiscordMember } from "../../cron";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";
import modules from "../../starkyModules";

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
        shouldHaveRole: boolean;
        roleId: string;
      }[];
      walletAddress: string;
    };
  };
  const updatedConfigs: UpdatedConfig = {};
  const discordMembers = await DiscordMemberRepository.find({
    where: {
      discordServerId: guildId,
      discordMemberId: userId,
    },
  });
  for (let index = 0; index < discordMembers.length; index++) {
    const discordMember = discordMembers[index];
    for (let index = 0; index < discordConfigs.length; index++) {
      const discordConfig = discordConfigs[index];
      if (discordConfig.starknetNetwork !== discordMember.starknetNetwork)
        continue;
      if (!updatedConfigs[discordConfig.starknetNetwork])
        updatedConfigs[discordConfig.starknetNetwork] = {
          configs: [],
          walletAddress: discordMember.starknetWalletAddress || "none",
        };

      updatedConfigs[discordConfig.starknetNetwork].configs.push({
        shouldHaveRole: !!(await refreshDiscordMember(
          discordConfig,
          discordMember,
          modules[discordConfig.starkyModuleType]
        )),
        roleId: discordConfig.discordRoleId,
      });
    }
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
