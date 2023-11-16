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
    | ModalSubmitInteraction,
  reply = true
) => {
  const member = interaction.member;
  if (
    !member ||
    !(member.permissions as PermissionsBitField).has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    if (reply)
      await interaction.reply({
        content: "❌ This command can only be called by an Administrator",
        ephemeral: true,
      });
    throw new Error("This command can only be called by an Administrator");
  }
};

export const assertManageRoles = async (
  interaction:
    | ChatInputCommandInteraction
    | SelectMenuInteraction
    | ButtonInteraction
    | ModalSubmitInteraction,
  reply = true
) => {
  const member = interaction.member;
  if (
    !member ||
    !(member.permissions as PermissionsBitField).has(
      PermissionsBitField.Flags.ManageRoles
    )
  ) {
    if (reply)
      await interaction.reply({
        content:
          "❌ This command can only be called by someone having the Manage Roles permission",
        ephemeral: true,
      });
    throw new Error(
      "This command can only be called by someone having the Manage Roles permission"
    );
  }
};

export const assertManageMessages = async (
  interaction:
    | ChatInputCommandInteraction
    | SelectMenuInteraction
    | ButtonInteraction
    | ModalSubmitInteraction,
  reply = true
) => {
  const member = interaction.member;
  if (
    !member ||
    !(member.permissions as PermissionsBitField).has(
      PermissionsBitField.Flags.ManageMessages
    )
  ) {
    if (reply)
      await interaction.reply({
        content:
          "❌ This command can only be called by someone having the Manage Messages permission",
        ephemeral: true,
      });
    throw new Error(
      "This command can only be called by someone having the Manage Messages permission"
    );
  }
};

export const assertModerator = async (
  interaction:
    | ChatInputCommandInteraction
    | SelectMenuInteraction
    | ButtonInteraction
    | ModalSubmitInteraction,
  reply = true
) => {
  await assertAdmin(interaction, false).catch(
    async () =>
      await assertManageRoles(interaction, false).catch(
        async () =>
          await assertManageMessages(interaction, false).catch(async () => {
            if (reply)
              await interaction.reply({
                content:
                  "❌ This command can only be called by someone having the Manage Roles or Manage Messages permission",
                ephemeral: true,
              });
            throw new Error(
              "This command can only be called by someone having the Manage Roles or Manage Messages permission"
            );
          })
      )
  );
};
