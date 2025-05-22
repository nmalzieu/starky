import { ShouldHaveRole, StarkyModuleField } from "../types/starkyModules";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { callContract } from "../utils/starknet/call";
import WatchTowerLogger from "../watchTower";
import { uint256 } from "starknet";

export const name = "ERC20";
export const refreshInCron = false;
export const refreshOnTransfer = true;

export const fields: StarkyModuleField[] = [
  {
    id: "contractAddress",
    question: "ERC20 contract address :",
  },
  {
    id: "minimumBalance",
    question:
      "Minimum token balance required :",
  },
];

export const shouldHaveRole: ShouldHaveRole = async (
  starknetWalletAddress,
  starknetNetwork,
  starkyModuleConfig,
  cachedData = {}
) => {
  try {
    // Get token decimals if not cached
    let decimals;
    if (cachedData.decimals) {
      decimals = cachedData.decimals;
    } else {
      const decimalsResult = await execWithRateLimit(async () => {
        return await callContract({
          starknetNetwork,
          contractAddress: starkyModuleConfig.contractAddress,
          entrypoint: "decimals",
          calldata: [],
        });
      }, "starknet");

      decimals = parseInt(decimalsResult?.data?.[0] ?? "18");
    }

    // Calculate minimum balance with proper decimal formatting
    const minimumBalanceHuman = BigInt(starkyModuleConfig.minimumBalance || 0);
    const minimumBalanceRaw = minimumBalanceHuman * BigInt(10 ** decimals);

    // If we already have the balance cached, we can just check if it's above the minimum
    if (cachedData.balance) {
      const balance = BigInt(cachedData.balance);
      return balance >= minimumBalanceRaw;
    }

    // Otherwise, fetch the balance from the contract
    const result = await execWithRateLimit(async () => {
      return await callContract({
        starknetNetwork,
        contractAddress: starkyModuleConfig.contractAddress,
        entrypoint: "balanceOf",
        calldata: [starknetWalletAddress],
      });
    }, "starknet");

    // Handle uint256 response (low, high parts)
    let balance;
    if (result?.data && result.data.length >= 2) {
      // Convert using uint256 format
      balance = uint256.uint256ToBN({
        low: result.data[0],
        high: result.data[1],
      });
    } else {
      // Fallback to single value format
      balance = BigInt(result?.data?.[0] ?? 0);
    }

    return balance >= minimumBalanceRaw;
  } catch (e: any) {
    WatchTowerLogger.error(`ERC-20 module error: ${e.message}`, e);
    return false;
  }
};
