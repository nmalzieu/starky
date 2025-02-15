import { Guild, Routes } from "discord.js";

import { restDiscordClient } from "./client";

export const getDiscordServerName = async (
  guildId: string
): Promise<string | undefined> => {
  const guild = (await restDiscordClient.get(Routes.guild(guildId))) as Guild;
  return guild?.name;
};

export async function getDiscordServerInfo(serverId: string): Promise<{ name: string; icon: string | null }> {
  const response = await fetch(`https://discord.com/api/guilds/${serverId}`, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Discord server info: ${response.statusText}`);
  }
  const guildData = await response.json();
  return {
    name: guildData.name,
    icon: guildData.icon,
  };
}