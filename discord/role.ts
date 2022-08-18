import { Role, Routes } from "discord.js";
import { REST } from "@discordjs/rest";

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
