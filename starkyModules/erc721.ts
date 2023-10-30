import { uint256ToBN } from "starknet/dist/utils/uint256";

import { ShouldHaveRole, StarkyModuleField } from "../types/starkyModules";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { callContract } from "../utils/starknet/call";

export const name = "ERC-721";
export const refreshInCron = false;
export const refreshOnTransfer = true;

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
  // If we already have the assets, we can just check if the user has at least one
  if (cachedData.assets) {
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
  const balance = uint256ToBN({ low: result[0], high: result[1] });
  if (balance >= 1) return true;
  return false;
};
