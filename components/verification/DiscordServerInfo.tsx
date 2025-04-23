import React from "react";
import Image from "next/image"; // Importar Image de Next.js
import styles from "../../styles/Verify.module.scss";

type DiscordServerInfoProps = {
  discordServerName: string;
  discordServerIcon?: string | null;
  network: string;
  networkType: "starknet" | "stellar" | "ethereum";
};

const DiscordServerInfo: React.FC<DiscordServerInfoProps> = ({
  discordServerName,
  discordServerIcon,
  network,
  networkType,
}) => {
  // Determine the network label based on networkType
  const networkLabel =
    networkType === "starknet"
      ? "Starknet network"
      : networkType === "stellar"
      ? "Stellar network"
      : "Ethereum network";

  // Determine the icon path based on networkType (optional)
  const networkIcon =
    networkType === "starknet"
      ? "/assets/starknet-icon.png"
      : networkType === "stellar"
      ? "/assets/stellar-icon.png"
      : "/assets/ethereum-icon.png";

  return (
    <div className={styles.discordServerInfo}>
      <div className={styles.server}>
        {discordServerIcon ? (
          <Image
            src={discordServerIcon}
            alt={`${discordServerName} icon`}
            width={40}
            height={40}
            className={styles.serverIcon}
          />
        ) : (
          <span className={styles.serverIconPlaceholder}>
            {discordServerName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className={styles.serverName}>{discordServerName}</span>
      </div>
      <div className={styles.network}>
        {/* Only show network icon if the path exists */}
        {networkIcon && (
          <Image
            src={networkIcon}
            alt={`${networkLabel} icon`}
            width={20}
            height={20}
            className={styles.networkIcon}
          />
        )}
        <span>
          {networkLabel}: <b>{network}</b>
        </span>
      </div>
    </div>
  );
};

export default DiscordServerInfo;
