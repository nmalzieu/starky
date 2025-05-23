import axios from "axios";
import { NetworkName } from "../types/starknet";
import { CustomApi } from "../types/starkyModules";
import WatchTowerLogger from "../watchTower";

import { hexToDecimal } from "./data/felt";
import { retrieveAssetsFromStarkscan } from "./starkscan/retrieveAssetsFromStarkscan";
import { execWithRateLimit } from "./execWithRateLimit";

type RetrieveAssetsParameters = {
  network: NetworkName;
  contractAddress: string;
  ownerAddress: string;
  customApi?: CustomApi;
  address?: string;
};

export const retrieveAssets = async ({
  network,
  contractAddress,
  ownerAddress,
  customApi,
  address,
}: RetrieveAssetsParameters) => {
  // Check if network is Ethereum and handle accordingly
  if (network === "ethereum" || network === "mainnet") {
    const result = await fetchFromEtherscan(contractAddress, ownerAddress);
    return result;
  }

  if (!customApi || !customApi.apiUri) {
    return retrieveAssetsFromStarkscan({
      starknetNetwork: network,
      contractAddress,
      ownerAddress,
    });
  }

  const apiUri = customApi.apiUri;
  const apiParamName = customApi.paramName;

  if (!address) {
    console.log("⚠️ DEBUG - No address provided, returning empty array");
    return [];
  }

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
      console.error("❌ DEBUG - API call failed:", e);
      WatchTowerLogger.info(
        `[Custom API] Error while fetching assets: ${e}\n${nextUrl}`
      );
      break;
    }
  }

  return assets;
};

/**
 * Fetches asset information from Etherscan API
 * @param contractAddress - The contract address to fetch assets for
 * @param ownerAddress - The owner address (for potential future use)
 * @returns Promise<any[]> - Array of assets or empty array on error
 */
export const fetchFromEtherscan = async (
  contractAddress: string,
  ownerAddress: string
): Promise<any[]> => {
  const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY!;

  if (!ETHERSCAN_API_KEY) {
    console.error("❌ DEBUG - No Etherscan API key found in environment");
    WatchTowerLogger.info(
      "[Etherscan API] API key not found in environment variables"
    );
    return [];
  }

  try {
    // Fetch contract source code and ABI
    const contractUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;

    const contractResponse = await execWithRateLimit(
      async () => await axios.get(contractUrl),
      "etherscan"
    );

    if (contractResponse.data.status !== "1") {
      WatchTowerLogger.info(
        `[Etherscan API] Error fetching contract data: ${contractResponse.data.message}`
      );
      return [];
    }

    const contractData = contractResponse.data.result[0];

    // If it's an ERC-721 or ERC-1155 contract, fetch token details
    const hasOwnerOf = contractData.ABI.includes("ownerOf");
    const hasBalanceOf = contractData.ABI.includes("balanceOf");

    if (contractData.ContractName && (hasOwnerOf || hasBalanceOf)) {
      // Fetch token transfers for the owner
      const transferUrl = `https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress=${contractAddress}&address=${ownerAddress}&page=1&offset=100&sort=desc&apikey=${ETHERSCAN_API_KEY}`;

      const transferResponse = await execWithRateLimit(
        async () => await axios.get(transferUrl),
        "etherscan"
      );

      if (transferResponse.data.status === "1") {
        const transfers = transferResponse.data.result;

        const mappedTransfers = transfers.map((transfer: any) => ({
          contract_address: transfer.contractAddress,
          token_id: transfer.tokenID,
          token_name: transfer.tokenName,
          token_symbol: transfer.tokenSymbol,
          owner: transfer.to,
          transaction_hash: transfer.hash,
          block_number: transfer.blockNumber,
          timestamp: transfer.timeStamp,
        }));

        return mappedTransfers;
      } else {
        console.log(
          "ℹ️ DEBUG - No NFT transfers found, checking ERC-20 balance"
        );
      }
    } else {
      console.log("💰 DEBUG - Not an NFT contract, checking ERC-20 balance");
    }

    // For ERC-20 tokens, fetch balance
    const balanceUrl = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${ownerAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

    const balanceResponse = await execWithRateLimit(
      async () => await axios.get(balanceUrl),
      "etherscan"
    );

    if (
      balanceResponse.data.status === "1" &&
      balanceResponse.data.result !== "0"
    ) {
      const balance = [
        {
          contract_address: contractAddress,
          balance: balanceResponse.data.result,
          owner: ownerAddress,
          type: "ERC-20",
          name: contractData.ContractName,
        },
      ];

      return balance;
    }

    return [];
  } catch (error) {
    WatchTowerLogger.info(
      `[Etherscan API] Error while fetching assets: ${error}`
    );
    return [];
  }
};

export const parseApiUri = (apiUri: string, address: string) => {
  // Replace {ADDRESS_HEX} by the address of the user in hex format.
  // Replace {ADDRESS_INT} by the address of the user in integer format.
  // Example: https://api.starknet.id/addr_to_full_ids?addr={ADDRESS_INT}
  const addressHex = address;
  const addressInt = hexToDecimal(addressHex);

  const result = apiUri
    .replace("{ADDRESS_HEX}", addressHex || "0x0")
    .replace("{ADDRESS_INT}", addressInt || "0");

  return result;
};
