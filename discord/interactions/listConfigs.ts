import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";

import { DiscordServerConfigRepository } from "../../db";
import { assertManageRoles } from "../../utils/discord/permissions";

export const handleListConfigsCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  await assertManageRoles(interaction);
  if (!interaction.guildId) return;

  const configs = await DiscordServerConfigRepository.find({
    where: {
      discordServerId: interaction.guildId,
    },
    order: { id: "ASC" },
  });

  if (configs.length === 0) {
    await interaction.reply({
      content: "❌ No Starky configurations found for this server.",
      ephemeral: true,
    });
    return;
  }

  let response = "📌 **Starky Configurations for this server:**\n\n";
  configs.forEach((config, index) => {
    response += `**Configuration ${index + 1}:**\n`;
    response += `- **Network:** \`${config.starknetNetwork}\`\n`;
    response += `- **Assigned Role:** <@&${config.discordRoleId}>\n`;
    response += `- **Module:** \`${config.starkyModuleType}\`\n`;

    if (Object.keys(config.starkyModuleConfig).length > 0) {
      response += "- **Module Configurations:**\n";
      for (const [key, value] of Object.entries(config.starkyModuleConfig)) {
        response += `  - \`${key}\`: \`${value}\`\n`;
      }
    }
    response += "\n";
  });

  await interaction.reply({ content: response, ephemeral: true });
};
