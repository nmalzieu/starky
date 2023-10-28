import { uint256ToBN } from "starknet/dist/utils/uint256";

import { callContract } from "../starknet/call";

import { ShouldHaveRole, StarkyModuleField } from "./types";

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
  starkyModuleConfig
) => {
  const result = await callContract({
    starknetNetwork,
    contractAddress: starkyModuleConfig.contractAddress,
    entrypoint: "balanceOf",
    calldata: [starknetWalletAddress],
  });
  const balance = uint256ToBN({ low: result[0], high: result[1] });
  if (balance >= 1) return true;
  return false;
};
