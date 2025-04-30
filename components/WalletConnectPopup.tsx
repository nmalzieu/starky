import React, { useState } from "react";
import { connectWallet, switchNetwork } from "../utils/wallets";
import { NetworkName } from "../types/starknet";
import WatchTowerLogger from "../watchTower";
import styles from "../styles/Verify.module.scss";

interface WalletConnectPopupProps {
  networkType: "starknet" | "stellar" | "ethereum";
  network: NetworkName;
  onConnect: (account: any, chainId?: string, isArgent?: boolean) => void;
  onDisconnect: () => void;
}

const WalletConnectPopup: React.FC<WalletConnectPopupProps> = ({
  networkType,
  network,
  onConnect,
  onDisconnect,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switchSuccess, setSwitchSuccess] = useState(false);
  const [wallet, setWallet] = useState<any>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    const result = await connectWallet(networkType, network);
    setConnecting(false);

    if (result.error) {
      setError(result.error);
      if (networkType === "starknet" && result.isArgent) {
        setWallet(result);
      }
      return;
    }

    onConnect(result.account, result.chainId, result.isArgent);
  };

  const handleSwitchNetwork = async () => {
    if (!wallet) return;
    setSwitching(true);
    setSwitchError(null);
    const switchResult = await switchNetwork(
      networkType,
      wallet.account,
      network
    );
    setSwitching(false);

    if (switchResult.error) {
      setSwitchError(switchResult.error);
      setTimeout(() => setSwitchError(null), 5000);
      return;
    }

    setSwitchSuccess(true);
    setTimeout(() => setSwitchSuccess(false), 2000);
    onConnect(
      switchResult.account,
      switchResult.chainId,
      switchResult.isArgent
    );
  };

  const buttonText = () => {
    if (connecting) return "Connecting...";
    if (switching) return "Switching Networks...";
    return `Connect ${
      networkType === "starknet"
        ? "Starknet"
        : networkType === "stellar"
        ? "Stellar"
        : "Ethereum"
    } Wallet`;
  };

  return (
    <div>
      <button
        className={styles.connect}
        onClick={handleConnect}
        disabled={connecting || switching}
      >
        {buttonText()}
      </button>
      {error && (
        <div className="danger">
          {networkType === "starknet" && wallet?.isArgent ? (
            switching ? (
              "Confirm network switch in your Argent wallet..."
            ) : (
              <>
                {switchError && <div>{switchError}</div>}
                {switchSuccess && (
                  <div>Network switched successfully! Connecting...</div>
                )}
                {!switchError && !switchSuccess && (
                  <button
                    className={styles.connect}
                    onClick={handleSwitchNetwork}
                    disabled={switching}
                  >
                    Switch Network
                  </button>
                )}
              </>
            )
          ) : (
            <div>
              {error}
              {networkType === "starknet" && !wallet?.isArgent && (
                <>
                  <br />
                  We recommend using Argent Wallet for best experience.
                </>
              )}
              {networkType === "stellar" && (
                <>
                  <br />
                  We recommend using Freighter Wallet for best experience.
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletConnectPopup;
