import { uint256ToBN } from "starknet/dist/utils/uint256";
import { callContract } from "../starknet/call";
import { StarkcordModuleConfig, StarkcordModuleField } from "./types";

export const name = "ERC-721";

export const fields: StarkcordModuleField[] = [
  {
    id: "contractAddress",
    question: "What's the ERC-721 contract address?",
  },
];

export const shouldHaveRole = async (
  starknetWalletAddress: string,
  starknetNetwork: "mainnet" | "goerli",
  starkcordModuleConfig: StarkcordModuleConfig
): Promise<boolean> => {
  const result = await callContract({
    starknetNetwork,
    contractAddress: starkcordModuleConfig.contractAddress,
    entrypoint: "balanceOf",
    calldata: [starknetWalletAddress],
  });
  const balance = uint256ToBN({ low: result[0], high: result[1] });
  if (balance >= 1) {
    return true;
  }
  return false;
};
