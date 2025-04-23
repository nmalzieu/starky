import React from "react";
import styles from "../../styles/Verify.module.scss";

type WalletInfoProps = {
  account: any;
  networkType: "starknet" | "stellar" | "ethereum";
  balance?: string | null; // Agregar balance como prop opcional
  onDisconnect: () => void;
};

const WalletInfo: React.FC<WalletInfoProps> = ({
  account,
  networkType,
  balance,
  onDisconnect,
}) => {
  if (!account) return null;

  // Format the account address based on networkType
  const displayAddress =
    networkType === "starknet" && account?.address
      ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      : typeof account === "string"
      ? `${account.slice(0, 6)}...${account.slice(-4)}`
      : "Unknown Address";

  // Determine the label based on networkType
  const label =
    networkType === "starknet"
      ? "Starknet wallet"
      : networkType === "stellar"
      ? "Stellar wallet"
      : "Ethereum wallet";

  return (
    <div className={styles.walletInfo}>
      <span>
        {label}: <b>{displayAddress}</b>
      </span>
      {balance && (
        <span>
          Balance: <b>{balance}</b>
        </span>
      )}
      <button className={styles.disconnect} onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  );
};

export default WalletInfo;
