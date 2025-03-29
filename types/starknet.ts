export type NetworkName =
  | "mainnet"
  | "goerli"
  | "sepolia"
  | "stellar-mainnet"
  | "stellar-testnet";

export type StarknetAccount = {
  address: string;
  network: string;
};
