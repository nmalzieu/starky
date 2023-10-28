import { StreamClient, v1alpha2 } from "@apibara/protocol";
import {
  FieldElement,
  Filter,
  StarkNetCursor,
  v1alpha2 as starknet,
} from "@apibara/starknet";
import { hash } from "starknet";

import { AddressToRefreshRepository, NetworkStatusRepository } from "../db";
import { DiscordMember } from "../db/entity/DiscordMember";

import networks from "./networks.json";

require("dotenv").config();

type NetworkName = "mainnet" | "goerli";

export type MemberChunk = {
  lastBlockNumber: number;
  networkName: NetworkName;
  discordMembers: DiscordMember[];
};

const launchIndexers = () => {
  console.log("[Indexer] Launching indexers");
  console.log(`[Indexer] Found ${networks.length} networks`);
  // For each network, launch an indexer
  for (let network of networks) {
    const networkName = network.name as NetworkName;
    const networkUrl = network.url;
    console.log(`[Indexer] Launching ${networkName} indexer`);
    launchIndexer(networkName, networkUrl);
  }
};

export default launchIndexers;

const launchIndexer = async (networkName: NetworkName, networkUrl: string) => {
  // Read token from environment
  const AUTH_TOKEN =
    process.env[`APIBARA_AUTH_TOKEN_${networkName.toUpperCase()}`];
  // Use token when streaming data
  const client = new StreamClient({
    url: networkUrl,
    token: AUTH_TOKEN,
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
              const zeroAddress = "0x0";
              // Save addresses to refresh
              if (from !== zeroAddress)
                await InsertAddressIfNotInDB(networkName, from);
              if (to !== zeroAddress)
                await InsertAddressIfNotInDB(networkName, to);
              transferEventsCount++;
            }
          }
        }
        // Save block number
        if (blockNumber) {
          console.log(
            `[Indexer] Saving block number ${blockNumber} for ${networkName}. ${transferEventsCount} transfer events found`
          );
          await NetworkStatusRepository.save({
            network: networkName,
            lastBlockNumber: parseInt(blockNumber),
          });
        }
      }
    }
  }
};

const InsertAddressIfNotInDB = async (
  networkName: NetworkName,
  walletAddress: string
) => {
  const exists = await AddressToRefreshRepository.findOneBy({
    network: networkName,
    walletAddress,
  });
  if (!exists) {
    await AddressToRefreshRepository.insert({
      network: networkName,
      walletAddress,
    });
  }
};

const convertToStringAddress = (address: starknet.IFieldElement) => {
  return "0x" + FieldElement.toBigInt(address).toString(16);
};
