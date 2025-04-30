import {
  isConnected,
  getPublicKey,
  isAllowed,
  setAllowed,
  getNetwork,
} from "@stellar/freighter-api";
import WatchTowerLogger from "../../watchTower";

interface StellarConnectionResult {
  address: string | null;
  error: string | null;
}

export async function connectStellarWallet(
  network: "stellar-mainnet" | "stellar-testnet"
): Promise<StellarConnectionResult> {
  try {
    if (!isConnected()) {
      return {
        address: null,
        error:
          "Stellar Freighter wallet is not installed. Please install Freighter to connect.",
      };
    }

    const isAppAllowed = await isAllowed();
    if (!isAppAllowed) {
      const allowResult = await setAllowed();
      if (!allowResult) {
        return {
          address: null,
          error:
            "Permission denied. Please allow this app to connect in Freighter and try again.",
        };
      }
    }

    // Check the network
    const currentNetwork = await getNetwork();
    const expectedNetwork =
      network === "stellar-mainnet" ? "PUBLIC" : "TESTNET";
    if (currentNetwork !== expectedNetwork) {
      return {
        address: null,
        error: `Please switch Freighter to the ${
          network === "stellar-mainnet" ? "Mainnet" : "Testnet"
        } network.`,
      };
    }

    const publicKey = await getPublicKey();
    if (!publicKey) {
      return {
        address: null,
        error: "Failed to retrieve Stellar address. Please try again.",
      };
    }

    return {
      address: publicKey,
      error: null,
    };
  } catch (error: any) {
    WatchTowerLogger.error("Stellar connection failed:", error);
    return {
      address: null,
      error: "Failed to connect to Stellar wallet. Please try again.",
    };
  }
}
