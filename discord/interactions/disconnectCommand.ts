import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  REST,
} from "discord.js";
import { DiscordMemberRepository } from "../../db";

export const handleDisconnectConfirmCommand = async (
  interaction: ButtonInteraction,
  client: Client,
  restClient: REST
) => {
  const userId = interaction.member?.user?.id;
  const guildId = interaction.guildId;
  if (!userId || !guildId) return;
  const alreadyDiscordMember = await DiscordMemberRepository.findOneBy({
    id: userId,
    discordServerId: guildId,
  });
  if (!alreadyDiscordMember) return;
  // TODO => remove role !
  await DiscordMemberRepository.remove(alreadyDiscordMember);
  await interaction.update({
    content: "Disconnected!",
    components: [],
  });
};

export const handleDisconnectCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  const userId = interaction.member?.user?.id;
  const guildId = interaction.guildId;
  if (!userId || !guildId) return;
  const alreadyDiscordMember = await DiscordMemberRepository.findOneBy({
    id: userId,
    discordServerId: guildId,
  });
  if (!alreadyDiscordMember) {
    await interaction.reply({
      content: "You haven't linked any Starknet wallet to this Discord server.",
      ephemeral: true,
    });
    return;
  }
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("disconnect-confirm")
      .setLabel("Disconnect")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({
    content:
      "Do you really want to disconnect from your Starknet wallet? You will lose your Starknet-related role.",
    components: [row],
    ephemeral: true,
  });
};
