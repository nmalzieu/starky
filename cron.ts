import { IsNull, Not } from "typeorm";
import config from "./config";
import { DiscordMemberRepository, DiscordServerConfigRepository } from "./db";
import { DiscordMember } from "./db/entity/DiscordMember";
import { DiscordServerConfig } from "./db/entity/DiscordServerConfig";
import { restDiscordClient } from "./discord/client";
import { addRole, removeRole } from "./discord/role";
import modules from "./starkyModules";
import { StarkyModule } from "./starkyModules/types";

const refreshDiscordServerConfigs = async () => {
  const DiscordServerConfigs = await DiscordServerConfigRepository.find();
  for (let DiscordServerConfig of DiscordServerConfigs) {
    await refreshDiscordServerConfig(DiscordServerConfig);
  }
};

export const memberStarknetAddress = async (discordMember: DiscordMember) => {
  const discordMemberWithAddress = await DiscordMemberRepository.findOneBy({
    starknetWalletAddress: Not(IsNull()),
    discordMemberId: discordMember.discordMemberId,
    DiscordServerId: discordMember.DiscordServerId,
  });
  if (discordMemberWithAddress == null) return;
  discordMember.starknetWalletAddress =
    discordMemberWithAddress.starknetWalletAddress;
  //console.log(discordMember);
  return;
};

export const refreshDiscordServerConfig = async (
  DiscordServerConfig: DiscordServerConfig
) => {
  console.log(
    `[Cron] Refreshing discord server ${DiscordServerConfig.DiscordServerId}, configuration ${DiscordServerConfig.id}`
  );
  const discordMembers = await DiscordMemberRepository.find({
    where: {
      DiscordServerConfig,
    },
    withDeleted: true,
  });
  // Refreshing each member one by one. We could
  // optimize using a pool in parallel.
  const starkyModule = modules[DiscordServerConfig.starkyModuleType];
  if (!starkyModule) {
    console.error(
      `Server configuration ${DiscordServerConfig.id} uses module ${DiscordServerConfig.starkyModuleType} which does not exist`
    );
    return;
  }
  for (let discordMember of discordMembers) {
    try {
      await memberStarknetAddress(discordMember);
      //console.log(discordMember);
      await refreshDiscordMember(
        DiscordServerConfig,
        discordMember,
        starkyModule
      );
    } catch (e) {
      console.error(
        `Could not refresh discord member ${discordMember.discordMemberId} with configuration ${DiscordServerConfig.id}: ${e}`
      );
    }
  }
};

export const refreshDiscordMember = async (
  DiscordServerConfig: DiscordServerConfig,
  discordMember: DiscordMember,
  starkyModule?: StarkyModule
) => {
  if (!discordMember.starknetWalletAddress) return;
  const starkyMod =
    starkyModule || modules[DiscordServerConfig.starkyModuleType];
  // Always remove role for deleted users
  const shouldHaveRole = discordMember.deletedAt
    ? false
    : await starkyMod.shouldHaveRole(
        discordMember.starknetWalletAddress,
        DiscordServerConfig.starknetNetwork === "mainnet"
          ? "mainnet"
          : "goerli",
        DiscordServerConfig?.starkyModuleConfig
      );
  //console.log(discordMember);
  if (shouldHaveRole) {
    await addRole(
      restDiscordClient,
      DiscordServerConfig.DiscordServerId,
      discordMember.discordMemberId,
      DiscordServerConfig.discordRoleId
    );
  } else {
    await removeRole(
      restDiscordClient,
      DiscordServerConfig.DiscordServerId,
      discordMember.discordMemberId,
      DiscordServerConfig.discordRoleId
    );
  }

  if (discordMember.deletedAt) {
    await DiscordMemberRepository.remove(discordMember);
  }
};

const cronInterval = async () => {
  try {
    await refreshDiscordServerConfigs();
  } catch (e) {
    console.error(e);
  }
  setTimeout(cronInterval, config.UPDATE_STATUS_EVERY_SECONDS * 1000);
};

export default cronInterval;
