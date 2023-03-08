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
  for (let discordServer of discordServers) {
    await refreshDiscordServer(discordServer);
  }
};

export const refreshDiscordServer = async (discordServer: DiscordServer) => {
  console.log(`[Cron] Refreshing discord server ${discordServer.id}`);

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
  //console.log(discordMembers);
  // Refreshing each member one by one. We could
  // optimize using a pool in parallel.

  for (let discordMember of discordMembers) {
    let deleteDiscordMember = !!discordMember.deletedAt;
    let hasAtLeastOneRole = new Map();
    for (let discordConfig of discordConfigs) {
      const starkyModule = modules[discordConfig.starkyModuleType];
      if (!starkyModule) {
        console.error(
          `Server configuration ${discordConfig.id} uses module ${discordConfig.starkyModuleType} which does not exist`
        );
        continue;
      }
      try {
        let hasRole = await refreshDiscordMember(
          discordConfig,
          discordMember,
          starkyModule
        );
        if (!hasAtLeastOneRole.get(discordConfig.discordRoleId)) {
          hasAtLeastOneRole.set(discordConfig.discordRoleId, {
            server: discordConfig.discordServerId,
            hasRole: [hasRole],
          });
        } else {
          hasAtLeastOneRole.set(discordConfig.discordRoleId, {
            ...hasAtLeastOneRole.get(discordConfig.discordRoleId),
            hasRole: [
              ...hasAtLeastOneRole.get(discordConfig.discordRoleId).hasRole,
              hasRole,
            ],
          });
        }
      } catch (e: any) {
        console.log(e);
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
      if (deleteDiscordMember) {
        try {
          await DiscordMemberRepository.remove(discordMember);
        } catch (e) {
          console.error(
            `Could not delete discord member ${discordMember.discordMemberId} in server ${discordConfig.discordServerId} ${e}`
          );
        }
      }
    }

    //@ts-ignore
    // for each role and value of the map

    for (let [role, value] of Array.from(hasAtLeastOneRole.entries())) {
      let hasOneRoleArray = value.hasRole.filter(Boolean);

      if (0 === hasOneRoleArray.length) {
        await removeRole(
          restDiscordClient,
          value.server,
          discordMember.discordMemberId,
          role
        );
        continue;
      }
      await addRole(
        restDiscordClient,
        value.server,
        discordMember.discordMemberId,
        role
      );
    }
  }
};

export const refreshDiscordMember = async (
  discordServerConfig: DiscordServerConfig,
  discordMember: DiscordMember,
  starkyModule?: StarkyModule
) => {
  if (!discordMember.starknetWalletAddress) return;
  if (discordMember.starknetNetwork !== discordServerConfig.starknetNetwork)
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
  return shouldHaveRole;
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
