import axios from "axios";

import { NetworkName } from "../types/starknet";
import { CustomApi } from "../types/starkyModules";
import WatchTowerLogger from "../watchTower";

import { hexToDecimal } from "./data/felt";
import { retrieveAssetsFromStarkscan } from "./starkscan/retrieveAssetsFromStarkscan";
import { execWithRateLimit } from "./execWithRateLimit";

type RetrieveAssetsParameters = {
  starknetNetwork: NetworkName;
  contractAddress: string;
  ownerAddress: string;
  customApi?: CustomApi;
  address?: string;
};

export const retrieveAssets = async ({
  starknetNetwork,
  contractAddress,
  ownerAddress,
  customApi,
  address,
}: RetrieveAssetsParameters) => {
  if (!customApi || !customApi.apiUri)
    return retrieveAssetsFromStarkscan({
      starknetNetwork,
      contractAddress,
      ownerAddress,
    });
  const apiUri = customApi.apiUri;
  const apiParamName = customApi.paramName;
  if (!address) return [];
  let nextUrl = parseApiUri(apiUri, address);
  const assets = [];
  let calls = 0;
  while (nextUrl && calls < 10) {
    try {
      const { data } = await execWithRateLimit(
        async () => await axios.get(nextUrl),
        "unknown"
      );
      if (Array.isArray(data)) {
        assets.push(...data);
        break;
      }
      if (!data[apiParamName]) {
        WatchTowerLogger.info(
          `[Custom API] Error while fetching assets (field ${apiParamName} not found): ${JSON.stringify(
            data
          )}`
        );
        break;
      }
      assets.push(...data[apiParamName]);
      nextUrl = data.next_url;
      calls++;
    } catch (e) {
      WatchTowerLogger.info(
        `[Custom API] Error while fetching assets: ${e}\n${nextUrl}`
      );
      break;
    }
  }
  return assets;
};

export const parseApiUri = (apiUri: string, address: string) => {
  // Replace {ADDRESS_HEX} by the address of the user in hex format.
  // Replace {ADDRESS_INT} by the address of the user in integer format.
  // Example: https://api.starknet.id/addr_to_full_ids?addr={ADDRESS_INT}
  const addressHex = address;
  const addressInt = hexToDecimal(addressHex);
  return apiUri
    .replace("{ADDRESS_HEX}", addressHex || "0x0")
    .replace("{ADDRESS_INT}", addressInt || "0");
};
