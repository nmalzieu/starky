import { stringify } from "querystring";
import { uint256ToBN } from "starknet/dist/utils/uint256";
import { callContract } from "../starknet/call";
import { StarkyModuleConfig, StarkyModuleField, StarkyModule } from "./types";

export const name = "ERC-721";

export const fields: StarkyModuleField[] = [
  {
    id: "contractAddress",
    question: "What's the ERC-721 contract address?",
  },
];

export const configName = (
  starknetNetwork: string,
  starkyModuleConfig: StarkyModuleConfig
): string => {
  console.log(starkyModuleConfig);
  return starknetNetwork + " - ERC-721 - " + Object.values(starkyModuleConfig);
};

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
  const balance = uint256ToBN({ low: result[0], high: result[1] });
  if (balance >= 1) {
    return true;
  }
  return false;
};
