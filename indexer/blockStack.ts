import { refreshDiscordMember } from "../cron";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
  NetworkStatusRepository,
} from "../db";
import { DiscordMember } from "../db/entity/DiscordMember";
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
    const discordConfigs = await DiscordServerConfigRepository.findBy({
      discordServerId: member.discordServerId,
      starknetNetwork: networkName,
    });
    for (let index = 0; index < discordConfigs.length; index++) {
      const discordConfig = discordConfigs[index];
      const starkyModule = modules[discordConfig.starkyModuleType];
      try {
        await refreshDiscordMember(discordConfig, member, starkyModule);
      } catch (e: any) {
        if (e?.code === 10007) {
          // This user is no longer a member of this discord server, we should just remove it
          await DiscordMemberRepository.remove(member);
          console.log(
            `Discord member ${member.discordMemberId} does not exist in Discord server ${discordConfig.discordServerId} and will be deleted`
          );
        } else {
          console.error(
            `Could not refresh discord member ${member.discordMemberId} with configuration ${discordConfig.id} in server : ${discordConfig.discordServerId} ${e}`
          );
        }
        if (e?.code === 10013) {
          // The discord server no longer exists, we should just remove the config
          await DiscordServerConfigRepository.remove(discordConfig);
          console.log(
            `Discord server ${discordConfig.discordServerId} does not exist and will be deleted`
          );
        }
      }
    }
  }
  console.log(
    `[Indexer] Saving ${members.length} members in block ${blockNumber} for network ${networkName}.`
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
