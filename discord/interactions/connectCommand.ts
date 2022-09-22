import { ChatInputCommandInteraction, Client, REST } from "discord.js";
import { nanoid } from "nanoid";

import config from "../../config";
import { DiscordMemberRepository, DiscordServerRepository } from "../../db";
import { DiscordMember } from "../../db/entity/DiscordMember";

export const handleConnectCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client<boolean>,
  restClient: REST
) => {
  const guildId = interaction.guildId;
  const userId = interaction.member?.user?.id;
  if (!guildId || !userId) {
    await interaction.reply({ content: "An error occured", ephemeral: true });
    return;
  }

  const alreadyDiscordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!alreadyDiscordServer) {
    await interaction.reply({
      content: "Starky is not yet configured on this server",
      ephemeral: true,
    });
    return;
  }

  const alreadyDiscordMember = await DiscordMemberRepository.findOneBy({
    id: userId,
    discordServer: alreadyDiscordServer,
  });

  if (alreadyDiscordMember) {
    if (alreadyDiscordMember.starknetWalletAddress) {
      await interaction.reply({
        content:
          "You have already linked a Starknet wallet to this Discord server. Use `/starky-disconnect` first if you want to link a new one",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${alreadyDiscordMember.customLink} and verify your Starknet identity!`,
        ephemeral: true,
      });
    }
  } else {
    const newDiscordMember = new DiscordMember();
    newDiscordMember.discordServer = alreadyDiscordServer;
    newDiscordMember.discordMemberId = userId;
    newDiscordMember.customLink = nanoid();
    await DiscordMemberRepository.save(newDiscordMember);
    await interaction.reply({
      content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} and verify your Starknet identity!`,
      ephemeral: true,
    });
  }
};
