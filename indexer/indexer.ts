import { StreamClient } from "@apibara/protocol";
import { v1alpha2 as starknet } from "@apibara/starknet";

import networks from "../configs/networks.json";
import { DiscordMemberRepository, NetworkStatusRepository } from "../db";
import { BlockMember } from "../types/indexer";
import { NetworkName } from "../types/starknet";
import { convertFieldEltToStringHex } from "../utils/data/string";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { retrieveTx } from "../utils/starkscan/retrieveTx";

import BlockStack, { Block } from "./blockStack";
import { configure, onStramReconnect } from "./stream";

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
  let lastLoadedBlockNumber = 0;

  // Read token from environment
  const AUTH_TOKEN =
    process.env[`APIBARA_AUTH_TOKEN_${networkName.toUpperCase()}`];

  // Use token when streaming data
  const client: StreamClient = new StreamClient({
    url: networkUrl,
    token: AUTH_TOKEN,
    onReconnect: async (err, retryCount) =>
      onStramReconnect(
        err,
        retryCount,
        networkName,
        lastLoadedBlockNumber,
        client
      ),
    timeout: 1000 * 60 * 30, // 30 minutes
  });

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
  lastLoadedBlockNumber = lastBlockNumber;

  configure(client, lastBlockNumber);
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
        // Transactions
        for (let tx of block.transactions) {
          const receipt = tx.receipt;
          const events = receipt?.events;
          const txHash = receipt?.transactionHash;
          if (!events) continue;
          // Events
          for (let e of events) {
            const data = e?.data;
            if (data && txHash) {
              // Transfer event from invoke transaction
              if (data[0] && data[1]) {
                transferEventsCount++;
                const from = convertFieldEltToStringHex(data[0]);
                const to = convertFieldEltToStringHex(data[1]);
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
                    const txData = await execWithRateLimit(
                      async () =>
                        await retrieveTx({
                          starknetNetwork: networkName,
                          txHash: txHashString,
                        }),
                      "starkscan"
                    );
                    const contractAddressField = txData?.calldata[1];
                    if (contractAddressField) {
                      contractAddress = contractAddressField.toString();
                      contractAddresses[txHashString] = contractAddress;
                    }
                  }
                }
                for (let discordMember of discordMembers) {
                  if (
                    !blockMembers.find(
                      (u) =>
                        u.discordMember.id === discordMember.discordMemberId
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
        }
        // Insert block
        if (blockNumber) {
          lastLoadedBlockNumber = parseInt(blockNumber);
          const parsedBlock: Block = new Block(
            parseInt(blockNumber),
            blockMembers,
            networkName
          );
          blockStack.push(parsedBlock);
          console.log(
            `[Indexer] Adding block ${blockNumber} for ${networkName} in stack - size: ${blockStack.size()}. ${
              blockMembers.length
            } members found, for a total of ${transferEventsCount} transfer events`
          );
        }
      }
    }
  }
};
