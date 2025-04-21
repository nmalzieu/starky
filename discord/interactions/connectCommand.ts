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
import { ethers } from "ethers";

import config from "../../config";
import networks from "../../configs/networks.json";
import { DiscordMemberRepository, DiscordServerRepository } from "../../db";
import { DiscordMember } from "../../db/entity/DiscordMember";
import { DiscordServer } from "../../db/entity/DiscordServer";
import WatchTowerLogger from "../../watchTower";
import {
  ETHEREUM_ENABLED,
  INFURA_PROJECT_ID,
} from "./../../utils/ethereum/ethereumEnv";

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

export const initializeProvider = async (networkName: string) => {
  const network = networks.find(({ name }) => name === networkName);
  if (!network) throw new Error("Network not found");

  if (networkName === "Ethereum") {
    if (!ETHEREUM_ENABLED) return null;

    return new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`
    );
  }
  return null;
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
  const guildId = interaction.guildId;
  const userId = interaction.member?.user?.id;
  const networkName = interaction.customId.replace("reconnect_", "");

  if (!guildId || !userId) {
    await interaction.reply({ content: "An error occurred", ephemeral: true });
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

  //verification process based on network type
  const network = networks.find((n) => n.name === networkName)!;
  const verificationUrl = `${config.BASE_URL}/${network.verifyPage}/${guildId}/${userId}/${customLink}`;

  await interaction.followUp({
    content: `Go to this link: ${verificationUrl} and verify your identity on network: ${networkName}!`,
    ephemeral: true,
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

  const alreadyConnectedOnAllNetworks = await isConnectedOnAllNetworks(
    alreadyDiscordMembers,
    networks
  );

  if (
    alreadyDiscordMembers.length > 0 &&
    (alreadyConnectedOnAllNetworks ||
      alreadyDiscordMembers.find((d) => d.starknetWalletAddress === null))
  ) {
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
          "You have already linked a wallet to this Discord server on all networks. Use /starky-disconnect first if you want to link a new one",
        components: [actionRow],
        ephemeral: true,
      });
      return;
    } else {
      const memberData = alreadyDiscordMembers.find(
        (d) => d.starknetWalletAddress === null
      );
      if (!memberData) {
        await interaction.reply({
          content: "An error occured",
          ephemeral: true,
        });
        return;
      }
      const networkName = memberData.starknetNetwork;
      const network = networks.find((n) => n.name === networkName)!;

      const verificationUrl = `${config.BASE_URL}/${network.verifyPage}/${guildId}/${userId}/${memberData.customLink}`;

      await interaction.reply({
        content: `Go to this link: ${verificationUrl} and verify your identity on this network: ${memberData.starknetNetwork}! You can start over by using /starky-disconnect command.`,
        ephemeral: true,
      });
      return;
    }
  } else {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("user-config-network")
        .setPlaceholder("Select Network")
        .addOptions(
          ...networks.map((network) => ({
            label: network.label,
            description: network.description,
            value: network.name,
          }))
        )
    );

    await interaction.reply({
      content: "On what network do you want to connect to Starky?",
      components: [row],
      ephemeral: true,
    });
    return;
  }
};

export const handleUserNetworkConfigCommand = async (
  interaction: StringSelectMenuInteraction,
  client: Client,
  restClient: REST
) => {
  const guildId = interaction.guildId;
  const userId = interaction.member?.user?.id;
  const selectedNetwork = interaction.values[0];

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

  //verification process based on network type
  const network = networks.find((n) => n.name === selectedNetwork)!;

  const verificationUrl = `${config.BASE_URL}/${network.verifyPage}/${guildId}/${userId}/${newDiscordMember.customLink}`;

  await interaction.followUp({
    content: `Go to this link: ${verificationUrl} and verify your identity on network: ${selectedNetwork}!`,
    ephemeral: true,
  });
};
