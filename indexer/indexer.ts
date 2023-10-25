import { StreamClient, v1alpha2 } from "@apibara/protocol";
import {
  FieldElement,
  Filter,
  StarkNetCursor,
  v1alpha2 as starknet,
} from "@apibara/starknet";
import { hash } from "starknet";

import { refreshDiscordMember } from "../cron";
import {
  DiscordMemberRepository,
  DiscordServerConfigRepository,
  NetworkStatusRepository,
} from "../db";
import { DiscordMember } from "../db/entity/DiscordMember";
import modules from "../starkyModules";

import networks from "./networks.json";

require("dotenv").config();

type NetworkName = "mainnet" | "goerli";

type MemberChunk = {
  lastBlockNumber: number;
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

  const keys = [FieldElement.fromBigInt(hash.getSelectorFromName("Transfer"))];

  const filter = Filter.create()
    .withHeader({ weak: true })
    .addEvent((ev) => ev.withKeys(keys))
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
  const { lastBlockNumber } = (await NetworkStatusRepository.findOneBy({
    network: networkName,
  })) || { lastBlockNumber: 0 };

  const cursor = StarkNetCursor.createWithBlockNumber(lastBlockNumber);

  client.configure({
    filter,
    batchSize: 1,
    finality: v1alpha2.DataFinality.DATA_STATUS_ACCEPTED,
    cursor,
  });
  console.log(`[Indexer] Starting stream for ${networkName}`);

  const chunksToRefresh: MemberChunk[] = [];
  const chunkSize = 5;
  const refreshMembers: () => void = async () => {
    try {
      const chunk = chunksToRefresh[0];
      if (!chunk) {
        setTimeout(refreshMembers, 5000);
        return;
      }
      const lastBlockNumber = chunk.lastBlockNumber;
      // Refresh
      // Remove duplicates
      let membersToRefresh = chunk.discordMembers.filter(
        (member, index, self) =>
          index === self.findIndex((m) => m.id === member.id)
      );
      console.log(
        `[Indexer] Refreshing ${
          membersToRefresh.length
        } members on ${networkName}. Processing blocks from ${
          lastBlockNumber - chunkSize
        } to ${lastBlockNumber}.`
      );
      for (let member of membersToRefresh) {
        const discordConfigs = await DiscordServerConfigRepository.findBy({
          discordServerId: member.discordServerId,
          starknetNetwork: networkName,
        });
        for (let discordConfig of discordConfigs) {
          await refreshDiscordMember(
            discordConfig,
            member,
            modules[discordConfig.starkyModuleType]
          ).catch((e) => {});
        }
      }
      chunksToRefresh.shift();
      console.log(
        `[Indexer] Saved block number ${lastBlockNumber} for ${networkName}`
      );
      // Save progress in db
      await NetworkStatusRepository.update(
        { network: networkName },
        { lastBlockNumber: lastBlockNumber }
      );
      refreshMembers();
    } catch (e) {
      console.log(`[Indexer] Error in queue for ${networkName}`, e);
    }
  };
  refreshMembers();

  let chunk: MemberChunk = {
    lastBlockNumber: lastBlockNumber,
    discordMembers: [],
  };
  for await (const message of client) {
    if (message.data?.data) {
      for (let item of message.data.data) {
        // Block
        const block = starknet.Block.decode(item);
        const blockNumber = block.header?.blockNumber?.toString();
        // Transfer events
        for (let e of block.events) {
          const event = e.event;
          if (event?.data) {
            // Transfer event
            if (event.data[0]) {
              const from = FieldElement.toBigInt(event.data[0]);
              const to = FieldElement.toBigInt(event.data[1]);
              const fromMembers = await findUsers(from, networkName);
              const toMembers = await findUsers(to, networkName);
              chunk.discordMembers.push(...fromMembers, ...toMembers);
            }
          }
        }
        // Save block number
        if (blockNumber) {
          if (parseInt(blockNumber) % chunkSize == 0) {
            chunksToRefresh.push(chunk);
            chunk = {
              lastBlockNumber: parseInt(blockNumber),
              discordMembers: [],
            };
            console.log(
              `[Indexer] ${networkName} block: ${blockNumber}. ${chunksToRefresh.length} chunks in queue.`
            );
          }
        }
      }
    }
  }
};

const findUsers = async (address: bigint, networkName: NetworkName) =>
  await DiscordMemberRepository.find({
    where: {
      starknetWalletAddress: "0x" + address.toString(16),
      starknetNetwork: networkName,
    },
  });
