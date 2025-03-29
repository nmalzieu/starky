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
  MessageFlags,
} from "discord.js";
import { nanoid } from "nanoid";

import config from "../../config";
import networks from "../../configs/networks.json";
import { DiscordMemberRepository, DiscordServerRepository } from "../../db";
import { DiscordMember } from "../../db/entity/DiscordMember";
import { DiscordServer } from "../../db/entity/DiscordServer";
import WatchTowerLogger from "../../watchTower";

interface Network {
  name: string;
  url: string;
  chain: string;
  label: string;
  description: string;
  indexer?: boolean;
}

export const otherNetwork = (network: string) => {
  const currentNetworkIndex = (networks as Network[]).findIndex(
    ({ name }) => name === network
  );
  if (currentNetworkIndex === -1) {
    throw new Error("Invalid network name provided.");
  }
  const nextNetworkIndex = (currentNetworkIndex + 1) % networks.length;
  return (networks as Network[])[nextNetworkIndex].name;
};

const isConnectedOnAllNetworks = async (
  members: DiscordMember[],
  networks: Network[]
) => {
  const connectedNetworks = members.map((member) => member.starknetNetwork);
  return networks.every((network) => connectedNetworks.includes(network.name));
};

export const handleReconnectNetworkCommand = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  const guildId = interaction.guildId;
  const userId = interaction.member?.user?.id;
  const networkName = interaction.customId.replace("reconnect_", "");

  if (!guildId || !userId) {
    await interaction.reply({
      content: "An error occurred",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const alreadyDiscordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!alreadyDiscordServer) {
    await interaction.reply({
      content: "Starky is not yet configured on this server",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existingMember = await DiscordMemberRepository.findOne({
    where: {
      discordMemberId: userId,
      discordServerId: guildId,
      starknetNetwork: networkName,
    },
  });

  let customLink;

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
    flags: MessageFlags.Ephemeral,
  });
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
    await interaction.reply({
      content: "An error occurred",
      flags: MessageFlags.Ephemeral,
    });
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

  const alreadyConnectedOnAllNetworks = await isConnectedOnAllNetworks(
    alreadyDiscordMembers,
    networks as Network[]
  );

  if (alreadyDiscordMembers.length > 0) {
    if (alreadyConnectedOnAllNetworks) {
      const reconnectButtons = (networks as Network[]).map((network) => {
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
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // ... (rest of your existing conditions with flags updates)
  } else {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("user-config-network")
        .setPlaceholder("Starknet Network")
        .addOptions(
          ...(networks as Network[]).map((network) => ({
            label: network.label,
            description: network.description,
            value: network.name,
          }))
        )
    );

    await interaction.reply({
      content: "On what Starknet network do you want to connect to Starky?",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  WatchTowerLogger.info("An error occurred in Starky connect", {
    guildId,
    userId,
    alreadyDiscordMembers,
    alreadyDiscordServer,
  });

  await interaction.reply({
    content: "An error occurred in /starky-connect",
    flags: MessageFlags.Ephemeral,
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
    await interaction.reply({
      content: "An error occurred",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const alreadyDiscordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!alreadyDiscordServer) {
    await interaction.reply({
      content: "Starky is not yet configured on this server",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!(networks as Network[]).find((n) => n.name === interaction.values[0])) {
    await interaction.reply({
      content: "Invalid network selected.",
      flags: MessageFlags.Ephemeral,
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
    content: `Go to this link: ${config.BASE_URL}/verify/${guildId}/${userId}/${newDiscordMember.customLink} and verify your Starknet identity on network: ${interaction.values[0]}!`,
    flags: MessageFlags.Ephemeral,
  });
};
