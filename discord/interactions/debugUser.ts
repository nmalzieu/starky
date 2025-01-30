import { REST } from "@discordjs/rest";
import { AttachmentBuilder } from "discord.js";
import { ChatInputCommandInteraction, Client } from "discord.js";

import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";
import { NetworkName } from "../../types/starknet";
import { assertModerator } from "../../utils/discord/permissions";
import { refreshDiscordMemberForAllConfigs } from "../../utils/discord/refreshRoles";
import preLoadMemberAssets from "../../utils/preLoadMemberAssets";

export const handleDebugUserCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  if (interaction.user.id !== process.env.DEBUG_USER_ID)
    await assertModerator(interaction);
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
  const discordMembers = await DiscordMemberRepository.find({
    where: {
      discordServerId: guildId,
      discordMemberId: userId,
    },
  });
  type UpdatedConfigs = {
    [network: string]: {
      configs: {
        shouldHaveRole: boolean | undefined;
        roleId: string;
      }[];
      walletAddress: string;
    };
  };
  const updatedConfigs: UpdatedConfigs = {};
  type Assets = {
    [network: string]: any;
  };
  const assets: Assets = {};
  for (let index = 0; index < discordMembers.length; index++) {
    const discordMember = discordMembers[index];
    const network = discordMember.starknetNetwork as NetworkName;
    const discordServerConfigs = await DiscordServerConfigRepository.findBy({
      discordServerId: guildId,
      starknetNetwork: network,
    });
    const preLoadedAssets = await preLoadMemberAssets(
      discordMember,
      network,
      discordServerConfigs
    );
    assets[network] = preLoadedAssets;
    const res = await refreshDiscordMemberForAllConfigs(
      discordMember,
      preLoadedAssets
    );
    if (!res || !res.length) continue;
    updatedConfigs[network] = {
      configs: res,
      walletAddress: discordMembers[index].starknetWalletAddress as string,
    };
  }
  // Send loaded assets as a text file
  const assetsText = JSON.stringify(assets, null, 2);
  const assetsBuffer = Buffer.from(assetsText, "utf-8");
  const assetsAttachment = new AttachmentBuilder(assetsBuffer, {
    name: "assets.json",
  });
  await interaction.followUp({
    content: discordMembers.length
      ? `Updated configs for user ${selectedUser.username}:
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
  .join("\n")}`
      : `User ${selectedUser.username} didn't connect to any network.`,

    ephemeral: true,
    files: [assetsAttachment],
  });
};
