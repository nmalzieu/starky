import { uint256 } from "starknet";

import { callContract } from "../starknet/call";

import { StarkyModuleConfig, StarkyModuleField } from "./types";

export const name = "ERC-721";

export const fields: StarkyModuleField[] = [
  {
    id: "contractAddress",
    question: "What's the ERC-721 contract address?",
  },
];

export const shouldHaveRole = async (
  starknetWalletAddress: string,
  starknetNetwork: "mainnet" | "goerli",
  starkyModuleConfig: StarkyModuleConfig
): Promise<boolean> => {
  const result = await callContract({
    starknetNetwork,
    contractAddress: starkyModuleConfig.contractAddress,
    entrypoint: "balanceOf",
    calldata: [starknetWalletAddress],
  });
  const balance = uint256.uint256ToBN({ low: result[0], high: result[1] });
  console.log(balance);
  if (balance >= 1) {
    return true;
  }
  return false;
};
