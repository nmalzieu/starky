import axios from "axios";

import config from "../../config";
import { NetworkName } from "../../types/starknet";
import WatchTowerLogger from "../../watchTower";
import { execWithRateLimit } from "../execWithRateLimit";

type RetrieveTxParameters = {
  starknetNetwork: NetworkName;
  txHash: string;
};

export const retrieveTx = async ({
  starknetNetwork,
  txHash,
}: RetrieveTxParameters) => {
  const network = starknetNetwork === "mainnet" ? "api" : "api-testnet";
  const apiKey = config.STARKSCAN_API_KEY;
  try {
    const { data } = await execWithRateLimit(
      async () =>
        await axios.get(
          `https://${network}.starkscan.co/api/v0/transaction/${txHash}`,
          {
            headers: {
              "x-api-key": apiKey,
            },
          }
        ),
      "starkscan"
    );
    return data;
  } catch (e: any) {
    WatchTowerLogger.error(`[Starkscan] Error while fetching tx`, e);
    return null;
  }
};
