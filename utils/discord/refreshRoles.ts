import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
} from "../../db";
import { DiscordMember } from "../../db/entity/DiscordMember";
import { DiscordServerConfig } from "../../db/entity/DiscordServerConfig";
import { restDiscordClient } from "../../discord/client";
import { addRole, removeRole } from "../../discord/role";
import modules from "../../starkyModules";
import { NetworkName } from "../../types/starknet";
import { StarkyModule } from "../../types/starkyModules";
import preLoadMemberAssets from "../../utils/preLoadMemberAssets";

export const refreshDiscordMember = async (
  discordServerConfig: DiscordServerConfig,
  discordMember: DiscordMember,
  starkyModule: StarkyModule,
  cachedData?: { [key: string]: any }
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
        discordServerConfig?.starkyModuleConfig,
        cachedData
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
  return shouldHaveRole;
};

export const refreshDiscordMemberForAllConfigs = async (
  discordMember: DiscordMember,
  assets?: { [key: string]: any }
) => {
  if (!discordMember.starknetWalletAddress) return;
  const network = discordMember.starknetNetwork as NetworkName;
  const discordServerConfigs = await DiscordServerConfigRepository.findBy({
    discordServerId: discordMember.discordServerId,
    starknetNetwork: network,
  });
  const preLoadedAssets = assets
    ? assets
    : await preLoadMemberAssets(discordMember, network, discordServerConfigs);
  const res = [];
  for (let index = 0; index < discordServerConfigs.length; index++) {
    const discordConfig = discordServerConfigs[index];
    const starkyModule = modules[discordConfig.starkyModuleType];
    const assets =
      preLoadedAssets[discordConfig.starkyModuleConfig.contractAddress];
    const cachedData = assets && {
      assets,
    };
    try {
      const shouldHaveRole = await refreshDiscordMember(
        discordConfig,
        discordMember,
        starkyModule,
        cachedData
      );
      res.push({
        shouldHaveRole,
        roleId: discordConfig.discordRoleId,
      });
    } catch (e: any) {
      if (e?.code === 10007) {
        // This user is no longer a member of this discord server, we should just remove it
        console.log(
          `Discord member ${discordMember.discordMemberId} does not exist in Discord server ${discordConfig.discordServerId}. Deleting it.`
        );
        await DiscordMemberRepository.remove(discordMember);
      } else if (e?.code === 10011) {
        // The role no longer exists, we should just remove the config
        console.log(
          `Discord role ${discordConfig.discordRoleId} does not exist. Deleting configuration ${discordConfig.id} in server : ${discordConfig.discordServerId}`
        );
        await DiscordServerConfigRepository.remove(discordConfig);
      } else {
        console.error(
          `Could not refresh discord member ${discordMember.discordMemberId} with configuration ${discordConfig.id} in server : ${discordConfig.discordServerId} ${e}`
        );
      }
    }
  }
  return res;
};
