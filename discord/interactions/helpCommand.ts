import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";

export const handleHelpCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  try {
    const userId = interaction.member?.user?.id;
    const guildId = interaction.guildId;
    console.log({ interaction });
    if (!userId || !guildId) return;
    await interaction.reply({
      content: "For more information, visit [Starky](https://starky.wtf/).",
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error handling /help command:", error);
  }
};
