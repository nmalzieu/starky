import { OnReconnect, StreamClient, v1alpha2 } from "@apibara/protocol";
import {
  FieldElement,
  Filter,
  StarkNetCursor,
  v1alpha2 as starknet,
} from "@apibara/starknet";
import { Provider } from "starknet";
import { hash } from "starknet";

import networks from "../configs/networks.json";
import { DiscordMemberRepository, NetworkStatusRepository } from "../db";
import { BlockMember } from "../types/indexer";
import { NetworkName } from "../types/starknet";
import { execIfStackNotFull } from "../utils/execWithRateLimit";
import { convertFieldEltToStringHex } from "../utils/string";

import BlockStack, { Block } from "./blockStack";

require("dotenv").config();

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

const launchIndexer = async (
  networkName: NetworkName,
  networkUrl: string,
  blockStack: BlockStack
) => {
  // Read token from environment
  const AUTH_TOKEN =
    process.env[`APIBARA_AUTH_TOKEN_${networkName.toUpperCase()}`];

  const onReconnect: OnReconnect = async (err, retryCount) => {
    // handle error
    console.log(`[Indexer] Error in ${networkName} : ${err}`);
    console.log(`[Indexer] Retry count: ${retryCount}`);
    // wait 30 seconds before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 1000 * 30));
    console.log(`[Indexer] Reconnecting ${networkName} indexer`);
    // decide to reconnect or not
    return { reconnect: true };
  };

  // Use token when streaming data
  const client = new StreamClient({
    url: networkUrl,
    token: AUTH_TOKEN,
    onReconnect,
    timeout: 1000 * 60 * 5, // 5 minutes
  });

  // Starknet provider
  const provider = new Provider({
    network: networkName === "mainnet" ? "mainnet-alpha" : "goerli-alpha",
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
  const resetBlockNumbers = process.env[`APIBARA_RESET_BLOCK_NUMBERS`];
  if (lastBlockNumber < configFirstBlockNumber || resetBlockNumbers)
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
        const blockMembers: BlockMember[] = [];
        const contractAddresses: { [key: string]: string } = {};
        // Transfer events
        for (let e of block.events) {
          const event = e.event;
          const receipt = e.receipt;
          const txHash = receipt?.transactionHash;
          const tx = e.transaction;
          if (event?.data && txHash && (tx?.invokeV0 || tx?.invokeV1)) {
            // Transfer event from invoke transaction
            if (event.data[0] && event.data[1]) {
              transferEventsCount++;
              const from = convertFieldEltToStringHex(event.data[0]);
              const to = convertFieldEltToStringHex(event.data[1]);
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
                const txHashString = convertFieldEltToStringHex(txHash);
                if (contractAddresses[txHashString]) {
                  contractAddress = contractAddresses[txHashString];
                } else {
                  const trace = await execIfStackNotFull(
                    async () => await provider.getTransactionTrace(txHash),
                    "starknet"
                  );
                  const contractAddressField =
                    trace?.function_invocation?.contract_address;
                  if (contractAddressField) {
                    contractAddress = contractAddressField.toString();
                    contractAddresses[txHashString] = contractAddress;
                  }
                }
              }
              for (let discordMember of discordMembers) {
                if (
                  !blockMembers.find(
                    (u) => u.discordMember.id === discordMember.discordMemberId
                  )
                )
                  blockMembers.push({
                    discordMember,
                    contractAddress: contractAddress,
                  });
              }
            }
          }
        }
        // Insert block
        if (blockNumber) {
          const parsedBlock: Block = new Block(
            parseInt(blockNumber),
            blockMembers,
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
