import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { nanoid } from "nanoid";

import config from "../../config";
import networks from "../../configs/networks.json";
import { DiscordMemberRepository, DiscordServerRepository } from "../../db";
import { DiscordMember } from "../../db/entity/DiscordMember";
import { DiscordServer } from "../../db/entity/DiscordServer";
import WatchTowerLogger from "../../watchTower";

export const otherNetwork = (network: string) => {
  const currentNetworkIndex = networks.findIndex(
    ({ name }) => name === network
  );
  if (currentNetworkIndex === -1) {
    throw new Error("Invalid network name provided.");
  }
  const nextNetworkIndex = (currentNetworkIndex + 1) % networks.length;
  return networks[nextNetworkIndex].name;
};

const isConnectedOnAllNetworks = async (
  members: DiscordMember[],
  networks: any[]
) => {
  const connectedNetworks = members.map((member) => member.starknetNetwork);
  return networks.every((network) => connectedNetworks.includes(network.name));
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

  let alreadyDiscordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (alreadyDiscordServer === null) {
    WatchTowerLogger.info("Creating discord server");
    alreadyDiscordServer = new DiscordServer();
    alreadyDiscordServer.id = guildId;
    await DiscordServerRepository.save(alreadyDiscordServer);
  }

  const alreadyDiscordMembers = await DiscordMemberRepository.findBy({
    discordMemberId: userId,
    discordServer: alreadyDiscordServer,
  });

  const alreadyConnectedOnAllNetworks = isConnectedOnAllNetworks(
    alreadyDiscordMembers,
    networks
  );

  if (alreadyDiscordMembers.length > 0) {
    if (await alreadyConnectedOnAllNetworks) {
      const reconnectButtons = networks.map((network) => {
        return new ButtonBuilder()
          .setCustomId(`reconnect_${network.name}`)
          .setLabel(`Reconnect ${network.name}`)
          .setStyle(ButtonStyle.Primary);
      });

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        reconnectButtons
      );

      await interaction.reply({
        content:
          "You have already linked a Starknet wallet to this Discord server on all networks. Use `/starky-disconnect` first if you want to link a new one",
        components: [actionRow],
        ephemeral: true,
      });
      return;
    } else if (
      alreadyDiscordMembers[0].starknetWalletAddress &&
      alreadyDiscordMembers.length == 1
    ) {
      // Finished setup on one network
      const newDiscordMember = new DiscordMember();

      newDiscordMember.discordMemberId =
        alreadyDiscordMembers[0].discordMemberId;
      newDiscordMember.customLink = nanoid();
      newDiscordMember.discordServer = alreadyDiscordServer;
      newDiscordMember.discordServerId = alreadyDiscordServer.id;
      newDiscordMember.starknetNetwork =
        otherNetwork(alreadyDiscordMembers[0].starknetNetwork) ?? "";
      await DiscordMemberRepository.save(newDiscordMember);

      await interaction.reply({
        content: `
You already connected on this Network : ${
          alreadyDiscordMembers[0].starknetNetwork
        }
Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${
          newDiscordMember.customLink
        } and verify your Starknet identity on network: ${otherNetwork(
          alreadyDiscordMembers[0].starknetNetwork
        )}!`,
        ephemeral: true,
      });
      return;
    } else if (
      alreadyDiscordMembers.length == 1 &&
      !alreadyDiscordMembers[0].starknetWalletAddress
    ) {
      await interaction.reply({
        content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${alreadyDiscordMembers[0].customLink} and verify your Starknet identity on this network : ${alreadyDiscordMembers[0].starknetNetwork} ! You can start over by using  /starky-disconnect command. `,
        ephemeral: true,
      });
      return;
    } else if (
      alreadyDiscordMembers.length == 2 &&
      alreadyDiscordMembers[0].starknetWalletAddress &&
      !alreadyDiscordMembers[1].starknetWalletAddress
    ) {
      await interaction.reply({
        content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${alreadyDiscordMembers[1].customLink} and verify your Starknet identity on this network : ${alreadyDiscordMembers[1].starknetNetwork}! You can start over by using  /starky-disconnect command.`,
        ephemeral: true,
      });
      return;
    } else if (
      alreadyDiscordMembers.length == 2 &&
      !alreadyDiscordMembers[0].starknetWalletAddress &&
      alreadyDiscordMembers[1].starknetWalletAddress
    ) {
      await interaction.reply({
        content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${alreadyDiscordMembers[0].customLink} and verify your Starknet identity on this network : ${alreadyDiscordMembers[0].starknetNetwork}! You can start over by using  /starky-disconnect command.`,
        ephemeral: true,
      });
      return;
    }
  } else {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("user-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(
          ...networks.map((network) => ({
            label: network.name,
            description: network.description,
            value: network.name,
          }))
        )
    );

    await interaction.reply({
      content: "On what Starknet network do you want to connect to Starky?",
      components: [row],
      ephemeral: true,
    });
    return;
  }

  WatchTowerLogger.info("An error occured in Starky connect", {
    guildId,
    userId,
    alreadyDiscordMembers,
    alreadyDiscordServer,
  });

  await interaction.reply({
    content: "An error occured in /starky-connect",
    ephemeral: true,
  });
};

export const handleUserNetworkConfigCommand = async (
  interaction: StringSelectMenuInteraction,
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

  if (!networks.find((n) => n.name === interaction.values[0])) {
    await interaction.reply({
      content: "Invalid network selected.",
      ephemeral: true,
    });
    return;
  }

  const newDiscordMember = new DiscordMember();
  newDiscordMember.starknetNetwork = interaction.values[0];
  newDiscordMember.discordServerId = guildId;
  newDiscordMember.discordMemberId = userId;
  newDiscordMember.customLink = nanoid();
  newDiscordMember.discordServer = alreadyDiscordServer;

  await DiscordMemberRepository.save(newDiscordMember);

  await interaction.update({
    content: "Thanks, following up...",
    components: [],
  });

  await interaction.followUp({
    content: `Go to this link : ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} and verify your Starknet identity on network : ${interaction.values[0]}!`,
    ephemeral: true,
  });
};
