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

// Read token from environment
const AUTH_TOKEN = process.env.APIBARA_AUTH_TOKEN;

// Use token when streaming data
const client = new StreamClient({
  url: "mainnet.starknet.a5a.ch",
  token: AUTH_TOKEN,
});

const keys = [FieldElement.fromBigInt(hash.getSelectorFromName("Transfer"))];

const filter = Filter.create()
  .withHeader({ weak: true })
  .addEvent((ev) => ev.withKeys(keys))
  .encode();

// Read block number from file
const blockNumber = parseInt(
  existsSync("blockNumber.txt")
    ? readFileSync("blockNumber.txt").toString()
    : process.env.APIBARA_DEFAULT_BLOCK_NUMBER || "0"
);
const cursor = StarkNetCursor.createWithBlockNumber(blockNumber);

client.configure({
  filter,
  batchSize: 10,
  finality: v1alpha2.DataFinality.DATA_STATUS_ACCEPTED,
  cursor,
});
export const launchIndexer = async () => {
  console.log("[Indexer] Starting stream");
  for await (const message of client) {
    if (message.data?.data) {
      for (let item of message.data.data) {
        const block = starknet.Block.decode(item);
        const blockNumber = block.header?.blockNumber?.toString();
        console.log(`[Indexer] Block: ${blockNumber}`);
        for (let e of block.events) {
          const event = e.event;
          if (event?.data) {
            const from = FieldElement.toBigInt(event.data[0]);
            const to = FieldElement.toBigInt(event.data[1]);
            const fromMembers = await findUsers(from);
            const toMembers = await findUsers(to);
            const usersToRefresh = [...fromMembers, ...toMembers];
            for (let discordMember of usersToRefresh) {
              const discordConfigs = await DiscordServerConfigRepository.findBy(
                {
                  discordServerId: discordMember.discordServerId,
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
          if (parseInt(blockNumber) % 50 == 0)
            writeFileSync("blockNumber.txt", blockNumber);
        }
      }
    }
  }
};

const findUsers = (address: bigint) =>
  DiscordMemberRepository.find({
    where: {
      starknetWalletAddress: "0x" + address.toString(16),
    },
  });
