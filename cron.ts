import { IsNull, Not } from "typeorm";
import config from "./config";
import { DiscordMemberRepository, DiscordServerRepository } from "./db";
import { DiscordMember } from "./db/entity/DiscordMember";
import { DiscordServer } from "./db/entity/DiscordServer";
import { restDiscordClient } from "./discord/client";
import { addRole, removeRole } from "./discord/role";
import modules from "./starkcordModules";
import { StarkcordModule } from "./starkcordModules/types";

const refreshDiscordServers = async () => {
  const discordServers = await DiscordServerRepository.find();
  for (let discordServer of discordServers) {
    await refreshDiscordServer(discordServer);
  }
};

export const refreshDiscordServer = async (discordServer: DiscordServer) => {
  console.log(`[Cron] Refreshing discord server ${discordServer.id}`);
  const discordMembers = await DiscordMemberRepository.find({
    where: {
      discordServer,
      starknetWalletAddress: Not(IsNull()),
    },
    withDeleted: true,
  });
  // Refreshing each member one by one. We could
  // optimize using a pool in parallel.
  const starkcordModule = modules[discordServer.starkcordModuleType];
  if (!starkcordModule) {
    console.error(
      `Discord server ${discordServer.id} is configured with module ${discordServer.starkcordModuleType} which does not exist`
    );
    return;
  }
  for (let discordMember of discordMembers) {
    try {
      await refreshDiscordMember(discordServer, discordMember, starkcordModule);
    } catch (e) {
      console.error(
        `Could not refresh discord member ${discordMember.id} from server ${discordServer.id}: ${e}`
      );
    }
  }
};

export const refreshDiscordMember = async (
  discordServer: DiscordServer,
  discordMember: DiscordMember,
  starkcordModule?: StarkcordModule
) => {
  if (!discordMember.starknetWalletAddress) return;
  const starkcordMod =
    starkcordModule || modules[discordServer.starkcordModuleType];
  // Always remove role for deleted users
  const shouldHaveRole = discordMember.deletedAt
    ? false
    : await starkcordMod.shouldHaveRole(
        discordMember.starknetWalletAddress,
        discordServer.starknetNetwork === "mainnet" ? "mainnet" : "goerli",
        discordServer?.starkcordModuleConfig
      );
  if (shouldHaveRole) {
    await addRole(
      restDiscordClient,
      discordServer.id,
      discordMember.id,
      discordServer.discordRoleId
    );
  } else {
    await removeRole(
      restDiscordClient,
      discordServer.id,
      discordMember.id,
      discordServer.discordRoleId
    );
  }

  if (discordMember.deletedAt) {
    await DiscordMemberRepository.remove(discordMember);
  }
};

const cronInterval = async () => {
  try {
    await refreshDiscordServers();
  } catch (e) {
    console.error(e);
  }
  setTimeout(cronInterval, config.UPDATE_STATUS_EVERY_SECONDS * 1000);
};

export default cronInterval;
