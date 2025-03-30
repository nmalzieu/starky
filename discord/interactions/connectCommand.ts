import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
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

export const handleReconnectNetworkCommand = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  if (!interaction.guildId || !interaction.member?.user?.id) {
    await interaction.reply({
      content: "An error occurred - missing guild or user ID",
      flags: "Ephemeral",
    });
    return;
  }

  const guildId = interaction.guildId;
  const userId = interaction.member.user.id;
  const networkName = interaction.customId.replace("reconnect_", "");

  const alreadyDiscordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!alreadyDiscordServer) {
    await interaction.reply({
      content: "Starky is not yet configured on this server",
      flags: "Ephemeral",
    });
    return;
  }

  try {
    const existingMember = await DiscordMemberRepository.findOne({
      where: {
        discordMemberId: userId,
        discordServerId: guildId,
        starknetNetwork: networkName,
      },
    });

    let customLink: string;
    if (existingMember) {
      existingMember.customLink = nanoid();
      await DiscordMemberRepository.save(existingMember);
      customLink = existingMember.customLink;
    } else {
      const newDiscordMember = new DiscordMember();
      newDiscordMember.starknetNetwork = networkName;
      newDiscordMember.discordServerId = guildId;
      newDiscordMember.discordMemberId = userId;
      newDiscordMember.customLink = nanoid();
      newDiscordMember.discordServer = alreadyDiscordServer;
      await DiscordMemberRepository.save(newDiscordMember);
      customLink = newDiscordMember.customLink;
    }

    await interaction.update({
      content: "Thanks, following up...",
      components: [],
    });

    await interaction.followUp({
      content: `Go to this link: ${config.BASE_URL}/verify/${guildId}/${userId}/${customLink} and verify your Starknet identity on network: ${networkName}!`,
      flags: "Ephemeral",
    });
  } catch (error) {
    WatchTowerLogger.error("Error in reconnect command:");
    await interaction.followUp({
      content: "An error occurred while processing your request",
      flags: "Ephemeral",
    });
  }
};

export const handleConnectCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client<boolean>,
  restClient: REST
) => {
  if (!interaction.guildId || !interaction.member?.user?.id) {
    await interaction.reply({
      content: "An error occurred - missing guild or user ID",
      flags: "Ephemeral",
    });
    return;
  }

  const guildId = interaction.guildId;
  const userId = interaction.member.user.id;

  try {
    let alreadyDiscordServer = await DiscordServerRepository.findOneBy({
      id: guildId,
    });

    if (!alreadyDiscordServer) {
      WatchTowerLogger.info("Creating discord server");
      alreadyDiscordServer = new DiscordServer();
      alreadyDiscordServer.id = guildId;
      await DiscordServerRepository.save(alreadyDiscordServer);
    }

    const alreadyDiscordMembers = await DiscordMemberRepository.findBy({
      discordMemberId: userId,
      discordServer: alreadyDiscordServer,
    });

    const alreadyConnectedOnAllNetworks = await isConnectedOnAllNetworks(
      alreadyDiscordMembers,
      networks
    );

    if (alreadyDiscordMembers.length > 0) {
      if (alreadyConnectedOnAllNetworks) {
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
          flags: "Ephemeral",
        });
        return;
      }

      // Handle other cases (1 or 2 members with various connection states)
      const unconnectedMember = alreadyDiscordMembers.find(
        (m) => !m.starknetWalletAddress
      );
      if (unconnectedMember) {
        await interaction.reply({
          content: `Go to this link: ${config.BASE_URL}/verify/${guildId}/${userId}/${unconnectedMember.customLink} and verify your Starknet identity on network: ${unconnectedMember.starknetNetwork}!`,
          flags: "Ephemeral",
        });
        return;
      }

      // If all members are connected but not all networks
      const nextNetwork = otherNetwork(
        alreadyDiscordMembers[0].starknetNetwork
      );
      const newDiscordMember = new DiscordMember();
      newDiscordMember.discordMemberId = userId;
      newDiscordMember.customLink = nanoid();
      newDiscordMember.discordServer = alreadyDiscordServer;
      newDiscordMember.discordServerId = guildId;
      newDiscordMember.starknetNetwork = nextNetwork;
      await DiscordMemberRepository.save(newDiscordMember);

      await interaction.reply({
        content: `You're already connected on ${alreadyDiscordMembers[0].starknetNetwork}. Go to this link: ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} to verify on ${nextNetwork}!`,
        flags: "Ephemeral",
      });
      return;
    }

    // New user case
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("user-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(
          ...networks.map((network) => ({
            label: network.label,
            description: network.description,
            value: network.name,
          }))
        )
    );

    await interaction.reply({
      content: "On what Starknet network do you want to connect to Starky?",
      components: [row],
      flags: "Ephemeral",
    });
  } catch (error) {
    WatchTowerLogger.error("Error in connect command:", {
      guildId,
      userId,
      error,
    });

    await interaction.reply({
      content: "An error occurred in /starky-connect",
      flags: "Ephemeral",
    });
  }
};

export const handleUserNetworkConfigCommand = async (
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  if (!interaction.guildId || !interaction.member?.user?.id) {
    await interaction.reply({
      content: "An error occurred - missing guild or user ID",
      flags: "Ephemeral",
    });
    return;
  }

  const guildId = interaction.guildId;
  const userId = interaction.member.user.id;

  try {
    const alreadyDiscordServer = await DiscordServerRepository.findOneBy({
      id: guildId,
    });

    if (!alreadyDiscordServer) {
      await interaction.reply({
        content: "Starky is not yet configured on this server",
        flags: "Ephemeral",
      });
      return;
    }

    const selectedNetwork = interaction.values[0];
    if (!networks.some((n) => n.name === selectedNetwork)) {
      await interaction.reply({
        content: "Invalid network selected.",
        flags: "Ephemeral",
      });
      return;
    }

    const newDiscordMember = new DiscordMember();
    newDiscordMember.starknetNetwork = selectedNetwork;
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
      content: `Go to this link: ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} to verify your Starknet identity on ${selectedNetwork}!`,
      flags: "Ephemeral",
    });
  } catch (error) {
    WatchTowerLogger.error("Error in network config command:");
    await interaction.followUp({
      content: "An error occurred while processing your request",
      flags: "Ephemeral",
    });
  }
};
