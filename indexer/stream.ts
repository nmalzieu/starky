import { StatusObject, StreamClient, v1alpha2 } from "@apibara/protocol";
import { FieldElement, Filter, StarkNetCursor } from "@apibara/starknet";
import { hash } from "starknet";

import { NetworkName } from "../types/starknet";

export const configure = (client: StreamClient, startingBlock: number) => {
  const cursor = StarkNetCursor.createWithBlockNumber(startingBlock);
  // Starknet provider
  const transferKey = [
    FieldElement.fromBigInt(hash.getSelectorFromName("Transfer")),
  ];

  const filter = Filter.create()
    .withHeader({ weak: true })
    .addTransaction((tx) => tx.invokeV0())
    .addTransaction((tx) => tx.invokeV1())
    .encode();

  client.configure({
    filter,
    batchSize: 1,
    finality: v1alpha2.DataFinality.DATA_STATUS_ACCEPTED,
    cursor,
  });
};

export const onStramReconnect = async (
  err: StatusObject,
  retryCount: number,
  networkName: NetworkName,
  blockNumber: number,
  client: StreamClient
) => {
  // handle error
  console.log(`[Indexer] Error in ${networkName} (${err.code}) : ${err}`);
  console.log(`[Indexer] Retry count: ${retryCount}`);
  // If RESOURCE_EXHAUSTED, skip the current block
  if (err.code === 8) {
    blockNumber++;
    console.log(`[Indexer] Skipping block ${blockNumber} for ${networkName}`);
    // Wait 3 seconds before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 1000 * 3));
    configure(client, blockNumber);
    return { reconnect: true };
  }
  // wait 10 seconds before reconnecting
  await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
  console.log(`[Indexer] Reconnecting ${networkName} indexer`);
  // decide to reconnect or not
  return { reconnect: true };
};
