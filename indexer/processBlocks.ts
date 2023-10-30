import { refreshDiscordMember } from "../cron";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
  NetworkStatusRepository,
} from "../db";
import modules from "../starkyModules";
import preLoadMemberAssets from "../utils/preLoadMemberAssets";

import BlockStack from "./blockStack";

const processBlocks = async (stack: BlockStack) => {
  const block = stack.shift();
  if (!block) {
    setTimeout(() => processBlocks(stack), 1000);
    return; // No block to process
  }
  const { blockNumber, blockMembers, networkName } = block;
  for (let index = 0; index < blockMembers.length; index++) {
    const blockMember = blockMembers[index];
    const member = blockMember.discordMember;
    const contractAddress = blockMember.contractAddress;
    const walletAddress = member.starknetWalletAddress;
    if (!walletAddress) continue;
    const discordConfigs = await DiscordServerConfigRepository.findBy({
      discordServerId: member.discordServerId,
      starknetNetwork: networkName,
    });
    const transferConfigs = discordConfigs.filter(
      (config) => modules[config.starkyModuleType].refreshOnTransfer
    );
    const preLoadedAssets = await preLoadMemberAssets(
      member,
      networkName,
      transferConfigs,
      contractAddress
    );
    for (let index = 0; index < transferConfigs.length; index++) {
      const discordConfig = transferConfigs[index];
      const starkyModule = modules[discordConfig.starkyModuleType];
      const assets =
        preLoadedAssets[discordConfig.starkyModuleConfig.contractAddress];
      const cachedData = assets && {
        assets,
      };
      if (cachedData)
        try {
          await refreshDiscordMember(
            discordConfig,
            member,
            starkyModule,
            cachedData
          );
        } catch (e: any) {
          if (e?.code === 10007) {
            // This user is no longer a member of this discord server, we should just remove it
            console.log(
              `Discord member ${member.discordMemberId} does not exist in Discord server ${discordConfig.discordServerId}. Deleting it.`
            );
            await DiscordMemberRepository.remove(member);
          } else if (e?.code === 10011) {
            // The role no longer exists, we should just remove the config
            console.log(
              `Discord role ${discordConfig.discordRoleId} does not exist. Deleting configuration ${discordConfig.id} in server : ${discordConfig.discordServerId}`
            );
            await DiscordServerConfigRepository.remove(discordConfig);
          } else {
            console.error(
              `Could not refresh discord member ${member.discordMemberId} with configuration ${discordConfig.id} in server : ${discordConfig.discordServerId} ${e}`
            );
          }
        }
    }
  }
  console.log(
    `[Indexer] Refreshed ${blockMembers.length} members in block ${blockNumber} - ${networkName} network.`
  );
  await NetworkStatusRepository.save({
    network: networkName,
    lastBlockNumber: blockNumber,
  });
  processBlocks(stack);
};

export default processBlocks;