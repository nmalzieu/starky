import { ClientError, createClient, Status } from "@apibara/protocol";
import { type Abi, Filter, StarknetStream } from "@apibara/starknet";
import { events } from "starknet";
import { credentials, Metadata } from "@grpc/grpc-js";

import config from "../config";
import networks from "../configs/networks.json";
import { DiscordMemberRepository, NetworkStatusRepository } from "../db";
import { BlockMember } from "../types/indexer";
import { NetworkName } from "../types/networks";
import { log } from "../utils/discord/logs";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { retrieveTx } from "../utils/starkscan/retrieveTxFromStarkscan";

import BlockStack, { Block } from "./blockStack";

require("dotenv").config();

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

const abiEvents = events.getAbiEvents(abi);
const [transferEventKey] = Object.keys(abiEvents);

const launchIndexers = () => {
  log("[Indexer] Launching indexers");
  log(`[Indexer] Found ${networks.length} networks`);
  const blockStack = new BlockStack();
  // For each network, launch an indexer
  for (let network of networks) {
    if (network.indexer === true) {
      const networkName = network.name as NetworkName;
      const networkUrl = network.url;
      log(`[Indexer] Launching ${networkName} indexer`, networkName);
      launchIndexer(networkName, networkUrl, blockStack);
    } else {
      log(`[Indexer] Skipping ${network.label} as indexer is disabled`);
    }
  }
};

export default launchIndexers;

const launchIndexer = async (
  networkName: NetworkName,
  networkUrl: string,
  blockStack: BlockStack
) => {
  let lastLoadedBlockNumber = 0;

  // Read token from environment
  const AUTH_TOKEN =
    process.env[`APIBARA_AUTH_TOKEN_${networkName.toUpperCase()}`];

  // Ensure that token is loaded correctly
  if (!AUTH_TOKEN) {
    throw new Error(
      `[Indexer] AUTH_TOKEN not set for ${networkName}. stream will be unauthenticated and fail.`
    );
  }

  // build auth for metadata
  const metadata = new Metadata();
  metadata.add(`authorization`, `Bearer ${AUTH_TOKEN}`);

  const callCredentials = credentials.createFromMetadataGenerator(
    (_, callback) => {
      callback(null, metadata);
    }
  );

  const channelCredentials = credentials.createSsl();

  // combine channel and call-level credentials
  const combinedCredentials = credentials.combineChannelCredentials(
    channelCredentials,
    callCredentials
  );

  // Use credentials when streaming data
  const client = createClient(StarknetStream, networkUrl, {
    credentials: combinedCredentials,
  });

  // Read block number from file
  const networkStatus = await NetworkStatusRepository.findOneBy({
    network: networkName,
  });
  const configFirstBlockNumber = parseInt(
    process.env[`APIBARA_DEFAULT_BLOCK_NUMBER_${networkName.toUpperCase()}`] ||
      "0"
  );
  if (networkStatus) {
    log(
      `[Indexer] Starting at block ${networkStatus.lastBlockNumber} for ${networkName}`,
      networkName
    );
  } else {
    NetworkStatusRepository.save({
      network: networkName,
      lastBlockNumber: configFirstBlockNumber,
    });
  }
  let { lastBlockNumber } = (await NetworkStatusRepository.findOneBy({
    network: networkName,
  })) || { lastBlockNumber: 0 };
  const resetBlockNumbers = process.env[`APIBARA_RESET_BLOCK_NUMBERS`];
  if (resetBlockNumbers) log(`[Indexer] Resetting block numbers`);
  if (lastBlockNumber < configFirstBlockNumber || resetBlockNumbers)
    lastBlockNumber = configFirstBlockNumber;
  lastLoadedBlockNumber = lastBlockNumber;

  log(`[Indexer] Starting stream for ${networkName}`, networkName);

  const filter = Filter.make({
    transactions: [{ includeReceipt: true }],
    messages: [{}],
    events: [{}],
    storageDiffs: [{}],
    contractChanges: [{}],
    nonceUpdates: [{}],
  });

  const buildRequest = (blockNumber: number) => {
    return StarknetStream.Request.make({
      filter: [filter],
      finality: "accepted",
      startingCursor: {
        orderKey: BigInt(blockNumber),
      },
    });
  };

  let request = buildRequest(lastBlockNumber);

  let previousBlock = 0;
  let stuckCounter = 0;
  while (true) {
    log(
      `[Indexer] Iterating indexer. Stuckcounter = ${stuckCounter}`,
      networkName
    );
    if (previousBlock == lastLoadedBlockNumber) stuckCounter++;
    else stuckCounter = 0;
    previousBlock = lastLoadedBlockNumber;
    if (stuckCounter > 10) {
      log(
        `[Indexer] Stuck for too long. Skipping block ${lastLoadedBlockNumber}`,
        networkName
      );
      request = buildRequest(lastLoadedBlockNumber + 1);
    }

    try {
      for await (const message of client.streamData(request, {
        timeout: 1000 * 60 * 10, // 10 minutes
      })) {
        switch (message._tag) {
          case "data": {
            for (const block of message.data.data) {
              if (block === null) {
                continue;
              }
              // Block
              const blockNumber = block.header?.blockNumber?.toString();
              const blockMembers: BlockMember[] = [];
              const contractAddresses: Record<string, string> = {};
              const transferEvents = block.events.filter(
                ({ keys }) => BigInt(keys[0]) === BigInt(transferEventKey)
              );
              // Transfer Events
              let transferEventsCount = 0;
              for (const transferEvent of transferEvents) {
                transferEventsCount++;
                // Transfer event from invoke transaction
                const from = transferEvent.data[0] || "O";
                const to = transferEvent.data[1] || "O";
                const discordMembers = await DiscordMemberRepository.find({
                  where: [
                    {
                      starknetWalletAddress: from,
                      starknetNetwork: networkName,
                    },
                    {
                      starknetWalletAddress: to,
                      starknetNetwork: networkName,
                    },
                  ],
                });
                if (discordMembers.length === 0) continue;
                // We try to get the tx contract address so that we don't have to refresh every configs for nothing
                let contractAddress = "";
                if (discordMembers.length > 0) {
                  if (contractAddresses[transferEvent.transactionHash]) {
                    contractAddress =
                      contractAddresses[transferEvent.transactionHash];
                  } else {
                    const txData = await execWithRateLimit(
                      async () =>
                        await retrieveTx({
                          starknetNetwork: networkName,
                          txHash: transferEvent.transactionHash,
                        }),
                      "starkscan"
                    );
                    const contractAddressField = txData?.calldata[1];
                    if (contractAddressField) {
                      contractAddress = contractAddressField.toString();
                      contractAddresses[transferEvent.transactionHash] =
                        contractAddress;
                    }
                  }
                }
                for (let discordMember of discordMembers) {
                  if (
                    !blockMembers.find(
                      (u) =>
                        u.discordMember.id === discordMember.discordMemberId &&
                        u.contractAddress === contractAddress
                    )
                  ) {
                    blockMembers.push({ discordMember, contractAddress });
                  }
                }
              }
              // Insert block
              if (blockNumber) {
                lastLoadedBlockNumber = parseInt(blockNumber);
                if (lastLoadedBlockNumber % 10 == 0)
                  request = buildRequest(lastLoadedBlockNumber + 1);
                const parsedBlock: Block = new Block(
                  parseInt(blockNumber),
                  blockMembers,
                  networkName
                );
                blockStack.push(parsedBlock);
                const logEveryXBlock = config.LOG_EVERY_X_BLOCK;
                if (blockNumber && Number(blockNumber) % logEveryXBlock === 0) {
                  log(
                    `[Indexer] Adding block ${blockNumber} for ${networkName} in stack - size: ${blockStack.size()}. ${
                      blockMembers.length
                    } members found, for a total of ${transferEventsCount} transfer events`,
                    networkName
                  );
                }
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof ClientError) {
        // handle error
        log(
          `[Indexer] Error in ${networkName} (${err.code}) : ${err}`,
          networkName
        );
        // If RESOURCE_EXHAUSTED, skip the current block
        if (err.code === Status.RESOURCE_EXHAUSTED) {
          lastLoadedBlockNumber++;
          log(
            `[Indexer] Skipping block ${lastLoadedBlockNumber} for ${networkName}`,
            networkName
          );
          // wait 10 seconds before reconnecting
          await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
        }
        // Wait 3 seconds before reconnecting
        await new Promise((resolve) => setTimeout(resolve, 1000 * 3));
        request = buildRequest(lastLoadedBlockNumber);
        log(`[Indexer] Reconnecting ${networkName} indexer`, networkName);
      }
    }
  }
};
