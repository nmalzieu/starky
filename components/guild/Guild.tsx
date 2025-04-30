import Image from "next/image";
import styles from "../../styles/Verify.module.scss";

type GuildProps = {
  discordServerName: string;
  discordServerIcon?: string | null;
};

const Guild = ({ discordServerName, discordServerIcon }: GuildProps) => {
  return (
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
  );
};

export default Guild;
