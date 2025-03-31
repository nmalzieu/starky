import Image from "next/image";
import styles from "../../styles/Verify.module.scss";

type DiscordServerInfoProps = {
  discordServerName: string;
  discordServerIcon?: string | null;
  starknetNetwork: string;
};

const DiscordServerInfo = ({
  discordServerName,
  discordServerIcon,
  starknetNetwork,
}: DiscordServerInfoProps) => {
  return (
    <div>
      <div className={styles.serverInfo}>
        Discord server:
        <span className={styles.serverDisplay}>
          {discordServerIcon ? (
            <img
              src={discordServerIcon}
              alt="Discord Server Icon"
              className={styles.discordIcon}
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
        Ethereum network:
        <Image
          src="/assets/ethereum-icon.png"
          height={25}
          width={25}
          alt="Ethereum Icon"
        />
        <b>{starknetNetwork}</b>
      </span>
    </div>
  );
};

export default DiscordServerInfo;
