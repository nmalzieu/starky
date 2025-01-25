import { REST } from "@discordjs/rest";
import {
  ActionRowBuilder,
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

/**
 * Returns the next network in the list based on the given network name.
 * @param {string} network - The current network name.
 * @returns {string} The next network name.
 */
export const otherNetwork = (network: string) => {
  const networkNames = networks.map((net) => net.name);
  const currentNetworkIndex = networkNames.indexOf(network);
  if (currentNetworkIndex === -1) {
    throw new Error("Invalid network name provided.");
  }
  return networkNames[(currentNetworkIndex + 1) % networkNames.length];
};

/**
 * Handles the /starky-connect command, guiding users through Starknet wallet linking.
 */
export const handleConnectCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client<boolean>,
  restClient: REST
) => {
  if (!interaction.member) return;

  const guildId = interaction.guildId;
  const userId = interaction.member?.user?.id;
  if (!guildId || !userId) {
    await interaction.reply({ content: "An error occurred", ephemeral: true });
    return;
  }

  let alreadyDiscordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });
  if (!alreadyDiscordServer) {
    alreadyDiscordServer = new DiscordServer();
    alreadyDiscordServer.id = guildId;
    await DiscordServerRepository.save(alreadyDiscordServer);
  }

  const alreadyDiscordMembers = await DiscordMemberRepository.findBy({
    discordMemberId: userId,
    discordServer: alreadyDiscordServer,
  });

  if (alreadyDiscordMembers.length > 0) {
    const allConnected =
      alreadyDiscordMembers.length === networks.length &&
      alreadyDiscordMembers.every((m) => m.starknetWalletAddress);

    if (allConnected) {
      await interaction.reply({
        content:
          "You have already linked a Starknet wallet on all available networks. Use `/starky-disconnect` first if you want to link a new one.",
        ephemeral: true,
      });
      return;
    }

    const unlinkedMember = alreadyDiscordMembers.find(
      (m) => !m.starknetWalletAddress
    );
    if (unlinkedMember) {
      await interaction.reply({
        content: `Go to this link: ${config.BASE_URL}/verify/${guildId}/${userId}/${unlinkedMember.customLink} and verify your Starknet identity on network: ${unlinkedMember.starknetNetwork}! Use /starky-disconnect to restart.`,
        ephemeral: true,
      });
      return;
    }

    // Create a new member entry for the next available network
    const linkedNetworks = alreadyDiscordMembers.map((m) => m.starknetNetwork);
    const availableNetwork = networks.find(
      (net) => !linkedNetworks.includes(net.name)
    );
    if (!availableNetwork) {
      await interaction.reply({
        content: "No available networks to connect.",
        ephemeral: true,
      });
      return;
    }

    const newDiscordMember = new DiscordMember();
    newDiscordMember.discordMemberId = userId;
    newDiscordMember.customLink = nanoid();
    newDiscordMember.discordServer = alreadyDiscordServer;
    newDiscordMember.discordServerId = guildId;
    newDiscordMember.starknetNetwork = availableNetwork.name;

    await DiscordMemberRepository.save(newDiscordMember);

    await interaction.reply({
      content: `You are now connecting on ${availableNetwork.name}. Verify your Starknet identity here: ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink}`,
      ephemeral: true,
    });
    return;
  }

  // Dynamic selection menu based on networks.json
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("user-config-network")
    .setPlaceholder("Select a Starknet Network")
    .addOptions(
      networks.map((net) => ({
        label: net.name,
        description: net.description,
        value: net.name.toLowerCase(),
      }))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );

  await interaction.reply({
    content: "On which Starknet network do you want to connect?",
    components: [row],
    ephemeral: true,
  });
};

/**
 * Handles the user's network selection from the dropdown menu.
 */
export const handleUserNetworkConfigCommand = async (
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  const guildId = interaction.guildId;
  const userId = interaction.member?.user?.id;

  if (!guildId || !userId) {
    await interaction.reply({ content: "An error occurred", ephemeral: true });
    return;
  }

  const alreadyDiscordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });
  if (!alreadyDiscordServer) {
    await interaction.reply({
      content: "Starky is not yet configured on this server.",
      ephemeral: true,
    });
    return;
  }

  const selectedNetwork = interaction.values[0];
  if (!networks.some((net) => net.name.toLowerCase() === selectedNetwork)) {
    await interaction.reply({
      content: "Invalid network selected.",
      ephemeral: true,
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
    content: `Go to this link: ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} and verify your Starknet identity on network: ${selectedNetwork}!`,
    ephemeral: true,
  });
};
