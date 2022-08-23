import { Role, Routes } from "discord.js";
import { REST } from "@discordjs/rest";
import config from "../config";

export const isBotRole = (role: Role): boolean => {
  if (
    role.tags &&
    (role.tags.botId === config.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
      (role.tags as any).bot_id === config.NEXT_PUBLIC_DISCORD_CLIENT_ID) // Getting bot_id from the API, not botID
  ) {
    return true;
  }
  return false;
};

export const getRoles = async (
  client: REST,
  guildId: string
): Promise<Role[]> => {
  const roles = await client.get(Routes.guildRoles(guildId));
  return roles as Role[];
};

export const addRole = (
  client: REST,
  guildId: string,
  memberId: string,
  roleId: string
) => client.put(Routes.guildMemberRole(guildId, memberId, roleId));

export const removeRole = (
  client: REST,
  guildId: string,
  memberId: string,
  roleId: string
) => client.delete(Routes.guildMemberRole(guildId, memberId, roleId));
