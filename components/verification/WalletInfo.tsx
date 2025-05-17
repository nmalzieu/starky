import React from "react";
import styles from "../../styles/Verify.module.scss";

type WalletInfoProps = {
  account: any;
  networkType: "starknet" | "stellar" | "ethereum";
  balance?: string | null;
  onDisconnect: () => void;
};

const WalletInfo: React.FC<WalletInfoProps> = ({
  account,
  networkType,
  balance,
  onDisconnect,
}) => {
  if (!account) return null;

  const displayAddress =
    networkType === "starknet" && account?.address
      ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
      : typeof account === "string"
      ? `${account.slice(0, 6)}...${account.slice(-4)}`
      : "Unknown Address";

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
      <br />
      <button className={styles.verifyButton} onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  );
};

export default WalletInfo;
