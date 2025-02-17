import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";

import { slashCommandsArray } from "../slashCommands";

export const handleHelpCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  try {
    const userId = interaction.member?.user?.id;
    const guildId = interaction.guildId;

    if (!userId || !guildId) return;

    const commands =
      slashCommandsArray
        .map((cmd) => `• \`/${cmd.name}\` - ${cmd.description}`)
        .join("\n") || "No commands available.";

    const responseMessage = `**Available Commands:**\n${commands}\n\nFor support, join our [Telegram Group](https://t.me/+Mi34Im1Uafc1Y2Q8).\nFor more information, visit [Starky](https://starky.wtf/).`;

    await interaction.reply({
      content: responseMessage,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error handling /help command:", error);
  }
};
