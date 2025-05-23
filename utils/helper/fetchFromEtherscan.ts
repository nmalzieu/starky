// **
//  * Fetches asset information from Etherscan API
//  * @param contractAddress - The contract address to fetch assets for
//  * @param ownerAddress - The owner address (for potential future use)
//  * @returns Promise<any[]> - Array of assets or empty array on error

import axios from "axios";
import WatchTowerLogger from "../../watchTower";
import { execWithRateLimit } from "../execWithRateLimit";

//  */
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
