import { REST } from "@discordjs/rest";
import { ChatInputCommandInteraction, Client } from "discord.js";
import { v4 as uuidv4 } from "uuid"; // For token generation

import { saveTokenToDatabase } from "../../utils/database"; // Assume DB handling function

export const handleAnalyticsCommand = async (
  interaction: ChatInputCommandInteraction,
  client: Client,
  restClient: REST
) => {
  try {
    // Extract guildId and userId from the interaction
    const userId = interaction.member?.user?.id;
    const guildId = interaction.guildId;

    // Ensure both userId and guildId are present
    if (!userId || !guildId) return;

    // Generate a unique token (UUID or crypto-based)
    const token = uuidv4();

    // Store the token in the database with guildId and userId
    {
      // TODO * await saveTokenToDatabase(guildId, userId, token); */
    }
    await saveTokenToDatabase(guildId, userId, token);

    // Construct the analytics URL with the token
    const analyticsUrl = `${process.env.BASE_URL}/analytics/${guildId}/${token}`;

    // Send the URL to the user in an ephemeral message
    await interaction.reply({
      content: `View analytics here: [Click Here](${analyticsUrl})`,
      ephemeral: true,
    });
  } catch (error) {
    // Handle errors gracefully
    console.error("Error handling /analytics command:", error);
  }
};
