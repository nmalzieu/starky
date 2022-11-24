import {
  ChatInputCommandInteraction,
  Client,
  REST,
  Snowflake,
  ActionRowBuilder,
  SelectMenuBuilder,
  SelectMenuInteraction,
} from "discord.js";
import { nanoid } from "nanoid";

import config from "../../config";
import { DiscordMemberRepository, DiscordServerRepository } from "../../db";
import { DiscordMember } from "../../db/entity/DiscordMember";

export const otherNetwork = (network: string) => {
  if (network == "goerli") {
    return "mainnet";
  }
  if (network == "mainnet") {
    return "goerli";
  }
};
export const handleConnectCommand = async (
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

  const alreadyDiscordMember = await DiscordMemberRepository.findBy({
    discordMemberId: userId,
  });
  var alreadyConnectedOnBothNetworks =
    alreadyDiscordMember.length == 2 &&
    alreadyDiscordMember[0].starknetWalletAddress &&
    alreadyDiscordMember[1].starknetWalletAddress;

  if (alreadyDiscordMember[0]) {
    if (alreadyConnectedOnBothNetworks) {
      await interaction.reply({
        content:
          "You have already linked a Starknet wallet to this Discord server on both networks. Use `/starky-disconnect` first if you want to link a new one",
        ephemeral: true,
      });
    } else if (
      alreadyDiscordMember[0].starknetWalletAddress &&
      alreadyDiscordMember.length == 1
    ) {
      var newDiscordMember = new DiscordMember();

      newDiscordMember.discordMemberId =
        alreadyDiscordMember[0].discordMemberId;
      newDiscordMember.customLink = nanoid();
      newDiscordMember.discordServer = alreadyDiscordServer;
      newDiscordMember.discordServerId = alreadyDiscordServer.id;
      newDiscordMember.starknetNetwork =
        otherNetwork(alreadyDiscordMember[0].starknetNetwork) ?? "";
      await DiscordMemberRepository.save(newDiscordMember);

      await interaction.reply({
        content: `
        You already connected on this Network : ${
          alreadyDiscordMember[0].starknetNetwork
        } 
        Go to this link : 
            ${config.BASE_URL}/verify/${guildId}/${userId}/${
          newDiscordMember.customLink
        } and verify your Starknet identity on ${otherNetwork(
          alreadyDiscordMember[0].starknetNetwork
        )} !`,
        ephemeral: true,
      });
    } else if (
      alreadyDiscordMember.length == 1 &&
      !alreadyDiscordMember[0].starknetWalletAddress
    ) {
      await interaction.reply({
        content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${alreadyDiscordMember[0].customLink} and verify your Starknet identity on this network : ${alreadyDiscordMember[0].starknetNetwork} !
        You can start over by using  /starky-disconnect command. `,
        ephemeral: true,
      });
    } else if (
      alreadyDiscordMember.length == 2 &&
      alreadyDiscordMember[0].starknetWalletAddress &&
      !alreadyDiscordMember[1].starknetWalletAddress
    ) {
      await interaction.reply({
        content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${alreadyDiscordMember[1].customLink} and verify your Starknet identity on this network : ${alreadyDiscordMember[1].starknetNetwork}!
         You can start over by using  /starky-disconnect command.`,
        ephemeral: true,
      });
    }
  } else {
    const row = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
      new SelectMenuBuilder()
        .setCustomId("user-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(
          {
            label: "Goerli",
            description: "The Goerli Starknet testnet",
            value: "goerli",
          },
          {
            label: "Mainnet",
            description: "The Starknet mainnet",
            value: "mainnet",
          }
        )
    );

    await interaction.reply({
      content: "On what Starknet network do you want to connect to Starky?",
      components: [row],
      ephemeral: true,
    });
  }
};

export const handleUserNetworkConfigCommand = async (
  interaction: SelectMenuInteraction,
  client: Client,
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
  var newDiscordMember = new DiscordMember();
  newDiscordMember.starknetNetwork = interaction.values[0];
  newDiscordMember.discordServerId = guildId;
  newDiscordMember.discordMemberId = userId;
  newDiscordMember.customLink = nanoid();
  newDiscordMember.discordServer = alreadyDiscordServer;

  await DiscordMemberRepository.save(newDiscordMember);
  await interaction.reply({
    content: `Go to this link : 
    ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} and verify your Starknet identity on network : ${interaction.values[0]}!`,
    ephemeral: true,
  });
};
