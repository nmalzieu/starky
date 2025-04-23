import { connect, disconnect } from "starknetkit";
import chainAliasByNetwork from "../../configs/chainAliasByNetwork.json";
import { NetworkName } from "../../types/starknet";
import WatchTowerLogger from "../../watchTower";

interface StarknetConnectionResult {
  account: any;
  chainId?: string;
  isArgent?: boolean;
  error: string | null;
}

export async function connectStarknetWallet(
  network: NetworkName
): Promise<StarknetConnectionResult> {
  try {
    const { wallet } = await connect();
    if (!wallet) {
      return {
        account: null,
        error:
          "No Starknet wallet detected. Please install a Starknet wallet like Argent X or Braavos.",
      };
    }

    WatchTowerLogger.info("Wallet information", wallet);
    const chainId =
      wallet.account?.provider?.chainId ||
      wallet.provider?.chainId ||
      wallet.chainId;
    const isArgentWallet = wallet.id.toLowerCase().includes("argent");

    const validChainIds = chainAliasByNetwork[network];
    if (!validChainIds.includes(chainId)) {
      return {
        account: wallet.account,
        chainId,
        isArgent: isArgentWallet,
        error: `Please switch your wallet to the ${network} network.`,
      };
    }

    return {
      account: wallet.account,
      chainId,
      isArgent: isArgentWallet,
      error: null,
    };
  } catch (error: any) {
    WatchTowerLogger.error("Starknet connection failed:", error);
    return {
      account: null,
      error: "Failed to connect to Starknet wallet. Please try again.",
    };
  }
}

export async function switchStarknetNetwork(
  wallet: any,
  network: NetworkName
): Promise<StarknetConnectionResult> {
  try {
    const targetChainId = chainAliasByNetwork[network][1]; // Use the second alias as the target chainId
    await wallet.request({
      type: "wallet_switchStarknetChain",
      params: { chainId: targetChainId },
    });

    // Wait for the wallet to update
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { wallet: refreshedWallet } = await connect();
    if (!refreshedWallet) {
      return {
        account: wallet.account,
        error:
          "Failed to refresh wallet after network switch. Please try again.",
      };
    }

    const newChainId =
      refreshedWallet.account?.provider?.chainId ||
      refreshedWallet.provider?.chainId ||
      refreshedWallet.chainId;
    const isValid = chainAliasByNetwork[network].some(
      (id: string) => id.toLowerCase() === newChainId?.toLowerCase()
    );

    if (!isValid) {
      return {
        account: refreshedWallet.account,
        chainId: newChainId,
        isArgent: refreshedWallet.id.toLowerCase().includes("argent"),
        error: "Network switch failed. Please try again.",
      };
    }

    return {
      account: refreshedWallet.account,
      chainId: newChainId,
      isArgent: refreshedWallet.id.toLowerCase().includes("argent"),
      error: null,
    };
  } catch (error: any) {
    WatchTowerLogger.error("Starknet network switch failed:", error);
    return {
      account: wallet.account,
      error: "Network switch failed. Please try again.",
    };
  }
}

export async function disconnectStarknetWallet(): Promise<void> {
  try {
    await disconnect();
  } catch (error: any) {
    WatchTowerLogger.error("Starknet disconnection failed:", error);
    throw new Error("Failed to disconnect Starknet wallet.");
  }
}
