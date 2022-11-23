import { IsNull, Not } from "typeorm";
import config from "./config";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "./db";
import { DiscordMember } from "./db/entity/DiscordMember";
import { DiscordServerConfig } from "./db/entity/DiscordServerConfig";
import { DiscordServer } from "./db/entity/DiscordServer";
import { restDiscordClient } from "./discord/client";
import { addRole, removeRole } from "./discord/role";
import modules from "./starkyModules";
import { StarkyModule } from "./starkyModules/types";

const refreshDiscordServers = async () => {
  const discordServers = await DiscordServerRepository.find();
  for (let discordServer of discordServers) {
    await refreshDiscordServer(discordServer);
  }
};

export const refreshDiscordServer = async (discordServer: DiscordServer) => {
  console.log(`[Cron] Refreshing discord server ${discordServer.id}`);
  const discordMembers = await DiscordMemberRepository.findBy({
    DiscordServerId: discordServer.id,
  });

  const discordConfigs = await DiscordServerConfigRepository.findBy({
    DiscordServerId: discordServer.id,
  });

  // Refreshing each member one by one. We could
  // optimize using a pool in parallel.

  for (let discordMember of discordMembers) {
    for (let discordConfig of discordConfigs) {
      const starkyModule = modules[discordConfig.starkyModuleType];
      if (!starkyModule) {
        console.error(
          `Server configuration ${discordConfig.id} uses module ${discordConfig.starkyModuleType} which does not exist`
        );
        return;
      }
      try {
        await refreshDiscordMember(discordConfig, discordMember, starkyModule);
      } catch (e) {
        console.error(
          `Could not refresh discord member ${discordMember.discordMemberId} with configuration ${discordConfig.id} in servr : ${discordConfig.DiscordServerId} ${e}`
        );
      }
    }
  }
};

export const refreshDiscordMember = async (
  discordServerConfig: DiscordServerConfig,
  discordMember: DiscordMember,
  starkyModule?: StarkyModule
) => {
  if (!discordMember.starknetWalletAddress) return;
  if (discordMember.starknetNetwork != discordServerConfig.starknetNetwork)
    return;
  const starkyMod =
    starkyModule || modules[discordServerConfig.starkyModuleType];
  // Always remove role for deleted users
  const shouldHaveRole = discordMember.deletedAt
    ? false
    : await starkyMod.shouldHaveRole(
        discordMember.starknetWalletAddress,
        discordServerConfig.starknetNetwork === "mainnet"
          ? "mainnet"
          : "goerli",
        discordServerConfig?.starkyModuleConfig
      );
  if (shouldHaveRole) {
    await addRole(
      restDiscordClient,
      discordServerConfig.DiscordServerId,
      discordMember.discordMemberId,
      discordServerConfig.discordRoleId
    );
  } else {
    await removeRole(
      restDiscordClient,
      discordServerConfig.DiscordServerId,
      discordMember.discordMemberId,
      discordServerConfig.discordRoleId
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
