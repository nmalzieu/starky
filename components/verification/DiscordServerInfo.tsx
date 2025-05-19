import Image from "next/image";
import styles from "../../styles/Verify.module.scss";
import Guild from "../guild/Guild";

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
      <Guild
        discordServerName={discordServerName}
        discordServerIcon={discordServerIcon}
      />
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
