import { connectStarknetWallet, switchStarknetNetwork } from "./starknet";
import { connectStellarWallet } from "./stellar";
import { NetworkName } from "../../types/starknet";

interface ConnectionResult {
  account: any;
  chainId?: string;
  isArgent?: boolean;
  error: string | null;
}

export async function connectWallet(
  networkType: "starknet" | "stellar" | "ethereum",
  network: NetworkName
): Promise<ConnectionResult> {
  switch (networkType) {
    case "starknet":
      const starknetResult = await connectStarknetWallet(network);
      return {
        account: starknetResult.account,
        chainId: starknetResult.chainId,
        isArgent: starknetResult.isArgent,
        error: starknetResult.error,
      };
    case "stellar":
      const stellarResult = await connectStellarWallet(
        network as "stellar-mainnet" | "stellar-testnet"
      );
      return {
        account: stellarResult.address,
        error: stellarResult.error,
      };
    case "ethereum":
      return {
        account: null,
        error: "Ethereum connection not implemented yet",
      };
    default:
      return {
        account: null,
        error: `Unsupported network type: ${networkType}`,
      };
  }
}

export async function switchNetwork(
  networkType: "starknet" | "stellar" | "ethereum",
  wallet: any,
  network: NetworkName
): Promise<ConnectionResult> {
  switch (networkType) {
    case "starknet":
      const switchResult = await switchStarknetNetwork(wallet, network);
      return {
        account: switchResult.account,
        chainId: switchResult.chainId,
        isArgent: switchResult.isArgent,
        error: switchResult.error,
      };
    case "stellar":
      return {
        account: null,
        error:
          "Stellar network switching is not supported. Please change the network in Freighter.",
      };
    case "ethereum":
      return {
        account: null,
        error: "Ethereum network switching not implemented yet",
      };
    default:
      return {
        account: null,
        error: `Unsupported network type for switching: ${networkType}`,
      };
  }
}
