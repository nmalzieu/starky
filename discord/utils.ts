import { Guild, Routes } from "discord.js";

import { restDiscordClient } from "./client";

export const getDiscordServerName = async (
  guildId: string
): Promise<string | undefined> => {
  const guild = (await restDiscordClient.get(Routes.guild(guildId))) as Guild;
  return guild?.name;
};
