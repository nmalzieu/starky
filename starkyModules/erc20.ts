import { BN } from "bn.js";

import { ShouldHaveRole, StarkyModuleField } from "../types/starkyModules";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { callContract } from "../utils/starknet/call";

export const name = "ERC-20";
export const refreshInCron = false;
export const refreshOnTransfer = true;

export const fields: StarkyModuleField[] = [
  {
    id: "contractAddress",
    question: "What's the ERC-20 contract address?",
  },
  {
    id: "minimumBalance",
    question: "What's the minimum token balance required for the role?",
  },
];

export const shouldHaveRole: ShouldHaveRole = async (
  starknetWalletAddress,
  starknetNetwork,
  starkyModuleConfig,
  cachedData = {}
) => {
  // If we already have the balance cached, we can just check if it's above the minimum
  if (cachedData.balance) {
    const balance = new BN(cachedData.balance);
    const minimumBalance = new BN(starkyModuleConfig.minimumBalance || 0);
    return balance.gte(minimumBalance);
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
  
  const balance = new BN(result?.data?.[0] ?? 0);
  const minimumBalance = new BN(starkyModuleConfig.minimumBalance || 0);
  
  return balance.gte(minimumBalance);
}; 