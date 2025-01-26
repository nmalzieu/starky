import { IsNull, Not } from "typeorm";

import { DiscordServer } from "./db/entity/DiscordServer";
import { refreshDiscordMember } from "./utils/discord/refreshRoles";
import config from "./config";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "./db";
import modules from "./starkyModules";
import WatchTowerLogger from "./watchTower";

const refreshDiscordServers = async () => {
  const discordServers = await DiscordServerRepository.find();
  WatchTowerLogger.info(
    `[Cron] Refreshing ${discordServers.length} discord servers`
  );
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
          WatchTowerLogger.info(
            `Discord member ${discordMember.discordMemberId} does not exist in Discord server ${discordConfig.discordServerId} and will be deleted`
          );
        } else {
          WatchTowerLogger.error(
            `Could not refresh discord member ${discordMember.discordMemberId} with configuration ${discordConfig.id} in server : ${discordConfig.discordServerId}`,
            e
          );
        }
      }
    }
    if (deleteDiscordMember) {
      await DiscordMemberRepository.remove(discordMember);
    }
  }
};

const cronInterval = async () => {
  try {
    await refreshDiscordServers();
  } catch (e: any) {
    WatchTowerLogger.info("[Cron] Error while refreshing discord servers");
    WatchTowerLogger.error(e.message, e);
  }
  setTimeout(cronInterval, config.UPDATE_STATUS_EVERY_SECONDS * 1000);
};

export default cronInterval;
