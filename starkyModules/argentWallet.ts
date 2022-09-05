import { callContract } from "../starknet/call";
import { getClassHashAt } from "../starknet/classHash";
import { StarkyModuleConfig, StarkyModuleField } from "./types";

const PROXY_HASH =
  "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918";
const ARGENT_IMPLEMENTATION_HASHES = [
  "0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328",
];

export const name = "Argent wallet detector";

export const fields: StarkyModuleField[] = [];

export const shouldHaveRole = async (
  starknetWalletAddress: string,
  starknetNetwork: "mainnet" | "goerli",
  starkyModuleConfig: StarkyModuleConfig
): Promise<boolean> => {
  const walletClassHash = await getClassHashAt({
    starknetNetwork,
    contractAddress: starknetWalletAddress,
  });
  // Argent uses a proxy implementation, let's check this contract is indeed a proxy contract
  if (walletClassHash.toLowerCase() !== PROXY_HASH) return false;
  // Now let's call get_implementation to check the wallet implementation hash
  const result = await callContract({
    starknetNetwork,
    contractAddress: starknetWalletAddress,
    entrypoint: "get_implementation",
  });
  if (result.length === 0) return false;
  const implementationHash = result[0].toLowerCase();
  return ARGENT_IMPLEMENTATION_HASHES.includes(implementationHash);
};
