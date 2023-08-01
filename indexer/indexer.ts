import { StreamClient, v1alpha2 } from "@apibara/protocol";
import {
  FieldElement,
  Filter,
  StarkNetCursor,
  v1alpha2 as starknet,
} from "@apibara/starknet";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { hash } from "starknet";

import { refreshDiscordMember } from "../cron";
import { DiscordMemberRepository, DiscordServerConfigRepository } from "../db";
import modules from "../starkyModules";

require("dotenv").config();

type NetworkName = "mainnet" | "goerli";

const launcherIndexers = async () => {
  // Get networks from this path :
  const path = "./indexer/networks.json";
  const file = readFileSync(path);
  const networks = JSON.parse(file.toString());
  // For each network, launch an indexer
  for (let network of networks) {
    const networkName = network.name;
    const networkUrl = network.url;
    launchIndexer(networkName, networkUrl);
  }
};

export default launcherIndexers;

export const launchIndexer = async (
  networkName: NetworkName,
  networkUrl: string
) => {
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
  const blockFileName = `blockNumber-${networkName}.txt`;
  const blockNumber = parseInt(
    existsSync(blockFileName)
      ? readFileSync(blockFileName).toString()
      : process.env[
          `APIBARA_DEFAULT_BLOCK_NUMBER_${networkName.toUpperCase()}`
        ] || "0"
  );
  const cursor = StarkNetCursor.createWithBlockNumber(blockNumber);

  client.configure({
    filter,
    batchSize: 10,
    finality: v1alpha2.DataFinality.DATA_STATUS_ACCEPTED,
    cursor,
  });
  console.log(`[Indexer] Starting stream - ${networkName}`);
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
            const from = FieldElement.toBigInt(event.data[0]);
            const to = FieldElement.toBigInt(event.data[1]);
            const fromMembers = await findUsers(from, networkName);
            const toMembers = await findUsers(to, networkName);
            const usersToRefresh = [...fromMembers, ...toMembers];
            for (let discordMember of usersToRefresh) {
              const discordConfigs = await DiscordServerConfigRepository.findBy(
                {
                  discordServerId: discordMember.discordServerId,
                  starknetNetwork: networkName,
                }
              );
              for (let discordConfig of discordConfigs) {
                await refreshDiscordMember(
                  discordConfig,
                  discordMember,
                  modules[discordConfig.starkyModuleType]
                );
              }
            }
          }
        }
        // Save block number
        if (blockNumber) {
          if (parseInt(blockNumber) % 50 == 0) {
            writeFileSync(blockFileName, blockNumber);
            console.log(`[Indexer] ${networkName} Block: ${blockNumber}`);
          }
        }
      }
    }
  }
};

const findUsers = (address: bigint, networkName: NetworkName) =>
  DiscordMemberRepository.find({
    where: {
      starknetWalletAddress: "0x" + address.toString(16),
      starknetNetwork: networkName,
    },
  });
