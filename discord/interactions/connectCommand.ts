import {
  ChatInputCommandInteraction,
  Client,
  REST,
  Snowflake,
} from "discord.js";
import { nanoid } from "nanoid";

import config from "../../config";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";
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

  const alreadyDiscordServer = await DiscordServerConfigRepository.findOneBy({
    DiscordServerId: guildId,
  });

  const allDiscordServerConfigs = await DiscordServerConfigRepository.findBy({
    DiscordServerId: guildId,
  });

  if (!alreadyDiscordServer) {
    await interaction.reply({
      content: "Starky is not yet configured on this server",
      ephemeral: true,
    });
    return;
  }

  const alreadyDiscordMember = await DiscordMemberRepository.findOneBy({
    discordMemberId: userId,
    DiscordServerId: guildId,
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
        content: `Go to this link : 
          ${config.BASE_URL}/verify/${guildId}/${userId}/${alreadyDiscordMember.customLink} and verify your Starknet identity!`,
        ephemeral: true,
      });
    }
  } else {
    var newDiscordMember = new DiscordMember();

    newDiscordMember.DiscordServerId = guildId;
    newDiscordMember.discordMemberId = userId;
    newDiscordMember.customLink = nanoid();

    for (var _i = 0; _i < allDiscordServerConfigs.length; _i++) {
      var currentRow = allDiscordServerConfigs[_i];
      newDiscordMember.DiscordServerConfig = currentRow;
      newDiscordMember.DiscordServerConfigId = currentRow.id;
      console.log("le config id est", currentRow.id);
      await DiscordMemberRepository.insert(newDiscordMember);
    }

    await interaction.reply({
      content: `Go to this link : 
      ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} and verify your Starknet identity!`,
      ephemeral: true,
    });
  }
};
