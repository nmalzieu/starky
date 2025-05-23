import { NetworkName } from "../types/networks";

export const isStarknetNetwork = (network: NetworkName) => {
  return network === "mainnet" || network === "goerli" || network === "sepolia";
};
