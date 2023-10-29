import { IsNull, Not } from "typeorm";

import { DiscordMember } from "./db/entity/DiscordMember";
import { DiscordServer } from "./db/entity/DiscordServer";
import { DiscordServerConfig } from "./db/entity/DiscordServerConfig";
import { restDiscordClient } from "./discord/client";
import { addRole, removeRole } from "./discord/role";
import { StarkyModule } from "./starkyModules/types";
import config from "./config";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "./db";
import modules from "./starkyModules";

const refreshDiscordServers = async () => {
  const discordServers = await DiscordServerRepository.find();
  console.log(`[Cron] Refreshing ${discordServers.length} discord servers`);
  for (let discordServer of discordServers) {
    await refreshDiscordServer(discordServer);
  }
};

export const refreshDiscordServer = async (discordServer: DiscordServer) => {
  const discordMembers = await DiscordMemberRepository.find({
    where: {
      discordServerId: discordServer.id,
      starknetWalletAddress: Not(IsNull()),
    },
    withDeleted: true,
  });

  const discordConfigs = await DiscordServerConfigRepository.findBy({
    discordServerId: discordServer.id,
  });

  // Refreshing each member one by one. We could
  // optimize using a pool in parallel.
  for (let discordMember of discordMembers) {
    let deleteDiscordMember = !!discordMember.deletedAt;
    const walletAddress = discordMember.starknetWalletAddress;
    if (!walletAddress) continue;
    const network = discordMember.starknetNetwork;
    if (!network) continue;
    for (let discordConfig of discordConfigs) {
      const starkyModule = modules[discordConfig.starkyModuleType];
      try {
        if (starkyModule.refreshInCron)
          await refreshDiscordMember(
            discordConfig,
            discordMember,
            starkyModule
          );
      } catch (e: any) {
        if (e?.code === 10007) {
          // This user is no longer a member of this discord server, we should just remove it
          deleteDiscordMember = true;
          console.log(
            `Discord member ${discordMember.discordMemberId} does not exist in Discord server ${discordConfig.discordServerId} and will be deleted`
          );
        } else {
          console.error(
            `Could not refresh discord member ${discordMember.discordMemberId} with configuration ${discordConfig.id} in server : ${discordConfig.discordServerId} ${e}`
          );
        }
      }
    }
    if (deleteDiscordMember) {
      await DiscordMemberRepository.remove(discordMember);
    }
  }
};

export const refreshDiscordMember = async (
  discordServerConfig: DiscordServerConfig,
  discordMember: DiscordMember,
  starkyModule: StarkyModule
) => {
  if (!discordMember.starknetWalletAddress) return;
  if (discordMember.starknetNetwork !== discordServerConfig.starknetNetwork)
    return;
  // Always remove role for deleted users
  const shouldHaveRole = discordMember.deletedAt
    ? false
    : await starkyModule.shouldHaveRole(
        discordMember.starknetWalletAddress,
        discordServerConfig.starknetNetwork === "mainnet"
          ? "mainnet"
          : "goerli",
        discordServerConfig?.starkyModuleConfig
      );
  if (shouldHaveRole) {
    await addRole(
      restDiscordClient,
      discordServerConfig.discordServerId,
      discordMember.discordMemberId,
      discordServerConfig.discordRoleId
    );
  } else {
    await removeRole(
      restDiscordClient,
      discordServerConfig.discordServerId,
      discordMember.discordMemberId,
      discordServerConfig.discordRoleId
    );
  }
};

const cronInterval = async () => {
  try {
    await refreshDiscordServers();
  } catch (e) {
    console.log("[Cron] Error while refreshing discord servers");
    console.error(e);
  }
  setTimeout(cronInterval, config.UPDATE_STATUS_EVERY_SECONDS * 1000);
};

export default cronInterval;
