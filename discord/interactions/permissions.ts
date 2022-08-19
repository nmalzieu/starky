import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  PermissionsBitField,
  SelectMenuInteraction,
} from "discord.js";

export const assertAdmin = async (
  interaction:
    | ChatInputCommandInteraction
    | SelectMenuInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
) => {
  const member = interaction.member;
  if (
    !member ||
    !(member.permissions as PermissionsBitField).has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    await interaction.reply({
      content: "❌ This command can only be called by an Administrator",
      ephemeral: true,
    });
    throw new Error("This command can only be called by an Administrator");
  }
};
