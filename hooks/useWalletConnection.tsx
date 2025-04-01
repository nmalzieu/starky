import { useCallback, useState } from "react";
import { useWallet } from "../utils/ethereum/context/WalletConnect";
import WatchTowerLogger from "../watchTower";

const useWalletConnection = () => {
  const { connect, disconnect, account, networkType, balance, signMessage } =
    useWallet();
  const [error, setError] = useState<string>("");

  const connectWallet = useCallback(async () => {
    try {
      setError("");
      await connect("Ethereum");
    } catch (err: any) {
      setError("Failed to connect wallet. Please try again.");
      WatchTowerLogger.error("Wallet connection error:", err);
    }
  }, [connect]);

  return {
    account,
    connectWallet,
    disconnect,
    networkType,
    balance,
    signMessage,
    error,
  };
};

export default useWalletConnection;
