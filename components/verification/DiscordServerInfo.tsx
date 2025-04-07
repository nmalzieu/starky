import Image from "next/image";
import styles from "../../styles/Verify.module.scss";

type DiscordServerInfoProps = {
  discordServerName: string;
  discordServerIcon?: string | null;
  network: string;
  networkType: "ethereum" | "starknet";
};

const DiscordServerInfo = ({
  discordServerName,
  discordServerIcon,
  network,
  networkType,
}: DiscordServerInfoProps) => {
  const networkIcons = {
    ethereum: "/assets/ethereum-icon.png",
    starknet: "/assets/starknet-icon.png",
  };

  const networkLabels = {
    ethereum: "Ethereum network:",
    starknet: "Starknet network:",
  };

  return (
    <div>
      <div className={styles.serverInfo}>
        Discord server:
        <span className={styles.serverDisplay}>
          {discordServerIcon ? (
            <Image
              src={discordServerIcon}
              alt="Discord Server Icon"
              className={styles.discordIcon}
              width={24}
              height={24}
            />
          ) : (
            <div className={styles.iconPlaceholder}>
              {discordServerName?.[0]?.toUpperCase()}
            </div>
          )}
          <b>{discordServerName}</b>
        </span>
      </div>
      <br />
      <span className={styles.networkDisplay}>
        {networkLabels[networkType]}
        <Image
          src={networkIcons[networkType]}
          height={25}
          width={25}
          alt={`${networkType} Icon`}
        />
        <b>{network}</b>
      </span>
    </div>
  );
};

export default DiscordServerInfo;
