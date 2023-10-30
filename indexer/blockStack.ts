import { BlockMember } from "../types/indexer";
import { NetworkName } from "../types/starknet";

import processBlocks from "./processBlocks";

class Block {
  blockNumber: number;
  blockMembers: BlockMember[];
  networkName: NetworkName;
  constructor(
    blockNumber: number,
    members: BlockMember[],
    networkName: NetworkName
  ) {
    this.blockNumber = blockNumber;
    this.blockMembers = members;
    this.networkName = networkName;
  }
}

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
