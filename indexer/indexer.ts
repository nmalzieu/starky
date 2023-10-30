import { OnReconnect, StreamClient, v1alpha2 } from "@apibara/protocol";
import {
  FieldElement,
  Filter,
  StarkNetCursor,
  v1alpha2 as starknet,
} from "@apibara/starknet";
import { hash } from "starknet";

import networks from "../configs/networks.json";
import { DiscordMemberRepository, NetworkStatusRepository } from "../db";
import { DiscordMember } from "../db/entity/DiscordMember";
import { NetworkName } from "../types/starknet";

import BlockStack, { Block } from "./blockStack";

require("dotenv").config();

export type MemberChunk = {
  lastBlockNumber: number;
  networkName: NetworkName;
  discordMembers: DiscordMember[];
};

const launchIndexers = () => {
  console.log("[Indexer] Launching indexers");
  console.log(`[Indexer] Found ${networks.length} networks`);
  const blockStack = new BlockStack();
  // For each network, launch an indexer
  for (let network of networks) {
    const networkName = network.name as NetworkName;
    const networkUrl = network.url;
    console.log(`[Indexer] Launching ${networkName} indexer`);
    launchIndexer(networkName, networkUrl, blockStack);
  }
};

export default launchIndexers;

const onReconnect: OnReconnect = (err, retryCount) => {
  // handle error
  console.log(`[Indexer] Error: ${err}`);
  console.log(`[Indexer] Retry count: ${retryCount}`);
  // decide to reconnect or not
  return { reconnect: true };
};

const launchIndexer = async (
  networkName: NetworkName,
  networkUrl: string,
  blockStack: BlockStack
) => {
  // Read token from environment
  const AUTH_TOKEN =
    process.env[`APIBARA_AUTH_TOKEN_${networkName.toUpperCase()}`];

  // Use token when streaming data
  const client = new StreamClient({
    url: networkUrl,
    token: AUTH_TOKEN,
    onReconnect,
    timeout: 1000 * 60 * 5, // 5 minutes
  });

  const transferKey = [
    FieldElement.fromBigInt(hash.getSelectorFromName("Transfer")),
  ];

  const filter = Filter.create()
    .withHeader({ weak: true })
    .addEvent((ev) => ev.withKeys(transferKey))
    .encode();

  // Read block number from file
  const networkStatusExists = await NetworkStatusRepository.findOneBy({
    network: networkName,
  });
  const configFirstBlockNumber = parseInt(
    process.env[`APIBARA_DEFAULT_BLOCK_NUMBER_${networkName.toUpperCase()}`] ||
      "0"
  );
  if (!networkStatusExists) {
    NetworkStatusRepository.save({
      network: networkName,
      lastBlockNumber: configFirstBlockNumber,
    });
  }
  let { lastBlockNumber } = (await NetworkStatusRepository.findOneBy({
    network: networkName,
  })) || { lastBlockNumber: 0 };
  if (lastBlockNumber < configFirstBlockNumber)
    lastBlockNumber = configFirstBlockNumber;

  const cursor = StarkNetCursor.createWithBlockNumber(lastBlockNumber);

  client.configure({
    filter,
    batchSize: 1,
    finality: v1alpha2.DataFinality.DATA_STATUS_ACCEPTED,
    cursor,
  });
  console.log(`[Indexer] Starting stream for ${networkName}`);

  let transferEventsCount = 0;
  for await (const message of client) {
    if (message.data?.data) {
      for (let item of message.data.data) {
        // Block
        const block = starknet.Block.decode(item);
        const blockNumber = block.header?.blockNumber?.toString();
        const blockUsers: DiscordMember[] = [];
        // Transfer events
        for (let e of block.events) {
          const event = e.event;
          const receipt = e.receipt;
          const txHash = receipt?.transactionHash;
          const tx = e.transaction;
          if (event?.data && txHash && (tx?.invokeV0 || tx?.invokeV1)) {
            // Transfer event from invoke transaction
            if (event.data[0] && event.data[1]) {
              const from = convertToStringAddress(event.data[0]);
              const to = convertToStringAddress(event.data[1]);
              const users = await DiscordMemberRepository.find({
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
              for (let user of users) {
                if (!blockUsers.find((u) => u.id === user.id))
                  blockUsers.push(user);
              }
              transferEventsCount++;
            }
          }
        }
        // Insert block
        if (blockNumber) {
          const parsedBlock: Block = new Block(
            parseInt(blockNumber),
            blockUsers,
            networkName
          );
          blockStack.push(parsedBlock);
          console.log(
            `[Indexer] Adding block ${blockNumber} for ${networkName} in stack - size: ${blockStack.size()}. ${transferEventsCount} transfer events found`
          );
        }
      }
    }
  }
};

const convertToStringAddress = (address: starknet.IFieldElement) => {
  return "0x" + FieldElement.toBigInt(address).toString(16);
};
