import { ClientError, createClient, Status } from "@apibara/protocol";
import { type Abi, Filter, StarknetStream } from "@apibara/starknet";
import { events } from "starknet";

import config from "../config";
import networks from "../configs/networks.json";
import { DiscordMemberRepository, NetworkStatusRepository } from "../db";
import { BlockMember } from "../types/indexer";
import { NetworkName } from "../types/starknet";
import { log } from "../utils/discord/logs";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { retrieveTx } from "../utils/starkscan/retrieveTx";

import BlockStack, { Block } from "./blockStack";

require("dotenv").config();

interface StarknetBlockHeader {
  blockNumber: bigint;
  parentBlockHash: string;
  sequencerAddress: string;
  timestamp: bigint;
  l1DataAvailabilityMode: number;
  l1DAMode: number;
}

interface StarknetEvent {
  keys: string[];
  data: string[];
  transactionHash: string;
}

interface StarknetBlock {
  header: StarknetBlockHeader;
  events: StarknetEvent[];
  transactions?: any[];
  stateUpdate?: any;
}

interface ProcessBlockResult {
  newBlockNumber: number;
  newTransferEvents: number;
}

const abi = [
  {
    kind: "struct",
    name: "Transfer",
    type: "event",
    members: [
      {
        kind: "key",
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "token_id",
        type: "core::integer::u256",
      },
    ],
  },
] satisfies Abi;

const NETWORK_ENDPOINTS: Record<NetworkName, string[]> = {
  mainnet: [
    "starknetid-mainnet.starknet.a5a.ch",
    "starknet-mainnet.public.blastapi.io",
    "free-rpc.starknet.io",
  ],
  sepolia: [
    "starknet-sepolia.public.blastapi.io",
    "starknet-sepolia-rpc.publicnode.com",
  ],
  goerli: ["starknet-goerli.public.blastapi.io", "free-rpc.starknet.io/goerli"],
  "stellar-mainnet": ["horizon.stellar.org"],
  "stellar-testnet": ["horizon-testnet.stellar.org"],
};

const MAX_RETRIES = 5;
const MAX_CONSECUTIVE_ERRORS = 10;
const BASE_RETRY_DELAY_MS = 3000;
const STREAM_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes

const launchIndexers = () => {
  log("[Indexer] Launching indexers");
  log(`[Indexer] Found ${networks.length} networks`);

  const blockStack = new BlockStack();

  networks.forEach((network) => {
    if (network.indexer === true) {
      const networkName = network.name as NetworkName;
      log(`[Indexer] Launching ${networkName} indexer`);
      startIndexerWithRetry(networkName, blockStack);
    } else {
      log(`[Indexer] Skipping ${network.name} as indexer is disabled`);
    }
  });
};

const startIndexerWithRetry = async (
  networkName: NetworkName,
  blockStack: BlockStack,
  retryCount = 0
): Promise<void> => {
  try {
    await launchIndexer(networkName, blockStack);
  } catch (err) {
    if (retryCount >= MAX_RETRIES) {
      log(
        `[Indexer] Permanent failure for ${networkName} after ${MAX_RETRIES} attempts`,
        networkName
      );
      return;
    }

    const delay = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, retryCount),
      30000 // Max 30s delay
    );

    log(
      `[Indexer] Retrying ${networkName} in ${delay / 1000}s (attempt ${
        retryCount + 1
      })`,
      networkName
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    await startIndexerWithRetry(networkName, blockStack, retryCount + 1);
  }
};

const launchIndexer = async (
  networkName: NetworkName,
  blockStack: BlockStack
): Promise<void> => {
  let consecutiveErrors = 0;
  let currentEndpointIndex = 0;
  let lastLoadedBlockNumber = await initializeBlockNumber(networkName);
  let transferEventsCount = 0;

  const filter = createFilter();
  const [transferEventKey] = Object.keys(events.getAbiEvents(abi));

  while (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    try {
      const endpoint = getCurrentEndpoint(networkName, currentEndpointIndex);
      const client = createClient(StarknetStream, endpoint);

      log(`[Indexer] Connected to ${endpoint} for ${networkName}`, networkName);

      const request = StarknetStream.Request.make({
        filter: [filter],
        finality: "accepted",
        startingCursor: { orderKey: BigInt(lastLoadedBlockNumber) },
      });

      for await (const message of client.streamData(request, {
        timeout: STREAM_TIMEOUT_MS,
      })) {
        if (message._tag === "data") {
          const blocks = [...message.data.data] as unknown as StarknetBlock[];
          const result = await processBlockData(
            blocks,
            networkName,
            transferEventKey,
            blockStack
          );

          lastLoadedBlockNumber = result.newBlockNumber;
          transferEventsCount += result.newTransferEvents;

          await saveBlockProgress(networkName, lastLoadedBlockNumber);
          consecutiveErrors = 0;
        }
      }
    } catch (err) {
      consecutiveErrors++;
      handleIndexerError(err, networkName, lastLoadedBlockNumber);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(
          `Too many consecutive errors (${MAX_CONSECUTIVE_ERRORS})`
        );
      }

      if (err instanceof ClientError && shouldRotateEndpoint(err.code)) {
        currentEndpointIndex =
          (currentEndpointIndex + 1) % NETWORK_ENDPOINTS[networkName].length;
        log(
          `[Indexer] Rotating to new endpoint for ${networkName}`,
          networkName
        );
      }

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          BASE_RETRY_DELAY_MS * Math.min(consecutiveErrors, 5)
        )
      );
    }
  }
};

const initializeBlockNumber = async (
  networkName: NetworkName
): Promise<number> => {
  const networkStatus = await NetworkStatusRepository.findOneBy({
    network: networkName,
  });
  const envBlockNumber = parseInt(
    process.env[`APIBARA_DEFAULT_BLOCK_NUMBER_${networkName.toUpperCase()}`] ||
      "0"
  );

  if (process.env.APIBARA_RESET_BLOCK_NUMBERS || !networkStatus) {
    await NetworkStatusRepository.upsert(
      { network: networkName, lastBlockNumber: envBlockNumber },
      ["network"]
    );
    return envBlockNumber;
  }

  return Math.max(networkStatus.lastBlockNumber, envBlockNumber);
};

const createFilter = (): Filter =>
  Filter.make({
    transactions: [{ includeReceipt: true }],
    messages: [{}],
    events: [{}],
    storageDiffs: [{}],
    contractChanges: [{}],
    nonceUpdates: [{}],
  });

const getCurrentEndpoint = (
  networkName: NetworkName,
  index: number
): string => {
  const endpoints = NETWORK_ENDPOINTS[networkName];
  if (!endpoints || endpoints.length === 0) {
    throw new Error(`No endpoints configured for ${networkName}`);
  }
  return endpoints[index % endpoints.length];
};

const processBlockData = async (
  blocks: StarknetBlock[],
  networkName: NetworkName,
  transferEventKey: string,
  blockStack: BlockStack
): Promise<ProcessBlockResult> => {
  let newBlockNumber = 0;
  let newTransferEvents = 0;
  const contractAddressCache: Record<string, string> = {};

  for (const block of blocks) {
    if (!block?.header?.blockNumber) continue;

    const blockNumber = Number(block.header.blockNumber);
    newBlockNumber = blockNumber;
    const blockMembers: BlockMember[] = [];

    for (const event of block.events) {
      if (event.keys[0] !== transferEventKey) continue;

      newTransferEvents++;
      const [from, to] = event.data;

      const members = await DiscordMemberRepository.find({
        where: [
          { starknetWalletAddress: from, starknetNetwork: networkName },
          { starknetWalletAddress: to, starknetNetwork: networkName },
        ],
      });

      if (members.length === 0) continue;

      const contractAddress = await getContractAddress(
        event.transactionHash,
        networkName,
        contractAddressCache
      );

      for (const member of members) {
        if (
          !blockMembers.some(
            (bm) =>
              bm.discordMember.id === member.discordMemberId &&
              bm.contractAddress === contractAddress
          )
        ) {
          blockMembers.push({ discordMember: member, contractAddress });
        }
      }
    }

    if (blockNumber) {
      blockStack.push(new Block(blockNumber, blockMembers, networkName));
      logBlockProgress(
        blockNumber,
        networkName,
        blockMembers.length,
        blockStack.size()
      );
    }
  }

  return { newBlockNumber, newTransferEvents };
};

const getContractAddress = async (
  txHash: string,
  networkName: NetworkName,
  cache: Record<string, string>
): Promise<string> => {
  if (cache[txHash]) return cache[txHash];

  try {
    const txData = await execWithRateLimit(
      () => retrieveTx({ starknetNetwork: networkName, txHash }),
      "starkscan"
    );

    const address = txData?.calldata[1]?.toString() || "";
    if (address) cache[txHash] = address;
    return address;
  } catch (err) {
    log(`[Indexer] Failed to fetch TX ${txHash}: ${err}`, networkName);
    return "";
  }
};

const saveBlockProgress = async (
  networkName: NetworkName,
  blockNumber: number
): Promise<void> => {
  await NetworkStatusRepository.upsert(
    { network: networkName, lastBlockNumber: blockNumber },
    ["network"]
  );
};

const logBlockProgress = (
  blockNumber: number,
  networkName: NetworkName,
  membersFound: number,
  stackSize: number
): void => {
  if (blockNumber % config.LOG_EVERY_X_BLOCK === 0) {
    log(
      `[Indexer] Block ${blockNumber} processed | ` +
        `Members: ${membersFound} | ` +
        `Stack size: ${stackSize}`,
      networkName
    );
  }
};

const handleIndexerError = (
  err: unknown,
  networkName: NetworkName,
  lastBlock: number
): void => {
  if (err instanceof ClientError) {
    log(
      `[Indexer] ${networkName} error (${err.code}): ${err.message}` +
        ` | Last block: ${lastBlock}`,
      networkName
    );
  } else {
    log(`[Indexer] Unexpected error: ${err}`, networkName);
  }
};

const shouldRotateEndpoint = (errorCode: Status): boolean => {
  return [
    Status.UNAVAILABLE,
    Status.UNIMPLEMENTED,
    Status.DEADLINE_EXCEEDED,
  ].includes(errorCode);
};

export default launchIndexers;
