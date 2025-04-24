import { useEffect, useState } from "react";
import styles from "../../styles/Verify.module.scss";
import { truncateAddress } from "../../utils/truncateAddess";

type EthereumAccount = string;
type StarknetAccount = { address: string };

type WalletInfoProps = {
  account: EthereumAccount | StarknetAccount | null;
  networkType: "ethereum" | "starknet";
  balance?: string | null;
  onDisconnect: () => void;
};

const WalletInfo = ({
  account,
  networkType,
  balance,
  onDisconnect,
}: WalletInfoProps) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // Check on initial render
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (!account) {
    return null;
  }
  // Get the address based on network type
  const getAddress = () => {
    if (networkType === "ethereum") {
      return account as EthereumAccount;
    } else {
      return (account as StarknetAccount).address;
    }
  };

  const address = getAddress();

  return (
    <span className={styles.starknetWallet}>
      {networkType === "ethereum" ? "Ethereum wallet" : "Starknet wallet"}:{" "}
      <b>{isMobile ? truncateAddress(address) : address}</b>{" "}
      <a onClick={onDisconnect}>disconnect</a>
      {networkType === "ethereum" && balance && (
        <>
          <br />
          Balance: <b>{balance ? `${balance} ETH` : "Loading..."}</b>
        </>
      )}
    </span>
  );
};

export default WalletInfo;
