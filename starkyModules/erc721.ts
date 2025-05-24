import { BN } from "bn.js";

import { ShouldHaveRole, StarkyModuleField } from "../types/starkyModules";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { callContract } from "../utils/starknet/call";

export const name = "ERC-721";
export const refreshInCron = false;
export const refreshOnTransfer = true;
export const networks = ["mainnet", "sepolia", "ethereum-mainnet"];

export const fields: StarkyModuleField[] = [
  {
    id: "contractAddress",
    question: "What's the ERC-721 contract address?",
  },
];

export const shouldHaveRole: ShouldHaveRole = async (
  starknetWalletAddress,
  starknetNetwork,
  starkyModuleConfig,
  cachedData = {}
) => {
  if (starknetNetwork !== "mainnet" && starknetNetwork !== "sepolia")
    return false;
  // If we already have the assets, we can just check if the user has at least one
  if (cachedData.assets?.length) {
    const assets = cachedData.assets;
    if (assets.length >= 1) return true;
    return false;
  }
  const result = await execWithRateLimit(async () => {
    return await callContract({
      starknetNetwork,
      contractAddress: starkyModuleConfig.contractAddress,
      entrypoint: "balanceOf",
      calldata: [starknetWalletAddress],
    });
  }, "starknet");
  const balance = new BN(result?.data?.[0] ?? 0);
  if (balance.gt(new BN(0))) return true;
  return false;
};
