import { refreshDiscordMember } from "../cron";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
  NetworkStatusRepository,
} from "../db";
import { DiscordMember } from "../db/entity/DiscordMember";
import { retrieveAssets } from "../starkscan/retrieveAssets";
import modules from "../starkyModules";
import { NetworkName } from "../types/starknet";

class Block {
  blockNumber: number;
  members: DiscordMember[];
  networkName: NetworkName;
  constructor(
    blockNumber: number,
    members: DiscordMember[],
    networkName: NetworkName
  ) {
    this.blockNumber = blockNumber;
    this.members = members;
    this.networkName = networkName;
  }
  addMember(member: DiscordMember) {
    this.members.push(member);
  }
}

const processBlocks = async (stack: BlockStack) => {
  const block = stack.shift();
  if (!block) {
    setTimeout(() => processBlocks(stack), 1000);
    return; // No block to process
  }
  const { blockNumber, members, networkName } = block;
  for (let index = 0; index < members.length; index++) {
    const member = members[index];
    const walletAddress = member.starknetWalletAddress;
    if (!walletAddress) continue;
    const discordConfigs = await DiscordServerConfigRepository.findBy({
      discordServerId: member.discordServerId,
      starknetNetwork: networkName,
    });
    const transferConfigs = discordConfigs.filter(
      (config) => modules[config.starkyModuleType].refreshOnTransfer
    );
    const contractAddresses = transferConfigs
      .map((config) => config.starkyModuleConfig.contractAddress)
      .filter((address) => !!address)
      // Remove duplicates
      .filter((value, index, self) => self.indexOf(value) === index);
    const preLoadedAssets = Object.fromEntries(
      await Promise.all(
        contractAddresses.map(async (address) => {
          const assets = await retrieveAssets({
            starknetNetwork: networkName,
            contractAddress: address,
            ownerAddress: walletAddress,
          });
          return [address, assets];
        })
      )
    );
    for (let index = 0; index < transferConfigs.length; index++) {
      const discordConfig = transferConfigs[index];
      const starkyModule = modules[discordConfig.starkyModuleType];
      const assets =
        preLoadedAssets[discordConfig.starkyModuleConfig.contractAddress];
      const cachedData = assets
        ? {
            assets,
          }
        : undefined;
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
          await DiscordMemberRepository.remove(member);
          console.log(
            `Discord member ${member.discordMemberId} does not exist in Discord server ${discordConfig.discordServerId} and will be deleted`
          );
        } else if (e?.code === 10011) {
          // The role no longer exists, we should just remove the config
          await DiscordServerConfigRepository.remove(discordConfig);
          console.log(
            `Discord role ${discordConfig.discordRoleId} does not exist and config will be deleted`
          );
        } else {
          console.error(
            `Could not refresh discord member ${member.discordMemberId} with configuration ${discordConfig.id} in server : ${discordConfig.discordServerId} ${e}`
          );
        }
      }
    }
  }
  console.log(
    `[Indexer] Refreshed ${members.length} members in block ${blockNumber} - ${networkName} network.`
  );
  await NetworkStatusRepository.save({
    network: networkName,
    lastBlockNumber: blockNumber,
  });
  processBlocks(stack);
};

class BlockStack {
  blockStack: Block[];
  processBlock: any;
  constructor() {
    this.blockStack = [];
    processBlocks(this);
  }
  push(block: Block) {
    this.blockStack.push(block);
  }
  shift() {
    return this.blockStack.shift();
  }
  size() {
    return this.blockStack.length;
  }
}

export default BlockStack;
export { Block };
