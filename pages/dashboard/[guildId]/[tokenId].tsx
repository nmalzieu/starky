import { NextPage, GetServerSideProps } from "next";
import Logo from "../../../components/Logo";
import SocialLinks from "../../../components/SocialLinks";
import styles from "../../../styles/Dashboard.module.scss";
import { validateDashboardToken } from "../../../utils/validateDashboardToken";
import RedirectMessage from "../../../components/RedirectMessage"; // optional if you want same UI

import {
  setupDb,
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "../../../db";
import { StarkyModuleConfig } from "../../../types/starkyModules";
import { getDiscordServerInfo } from "../../../discord/utils";
import Guild from "../../../components/guild/Guild";

interface Config {
  id: string;
  starknetNetwork: "goerli" | "mainnet" | "sepolia";
  discordRoleId: string;
  starkyModuleType: string;
  starkyModuleConfig: StarkyModuleConfig;
}

interface DashboardPageProps {
  configs: Config[];
  guildId: string;
  discordServerName: string | null;
  discordServerIcon: string | null;
  error?: string;
}

const DashboardPage: NextPage<DashboardPageProps> = ({
  configs,
  guildId,
  discordServerName,
  discordServerIcon,
  error,
}) => {
  if (error == "Invalid or expired token.") {
    return (
      <RedirectMessage
        title="Session Expired"
        description="Your access token has expired. You'll be redirected shortly."
        redirectTo="/"
      />
    );
  }
  if (error) {
    return (
      <div className={styles.container}>
        <Logo />
        <h1>Error</h1>
        <p>{error}</p>
        <SocialLinks />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Logo />
      <h1>Dashboard</h1>
      <Guild
        discordServerName={discordServerName!}
        discordServerIcon={discordServerIcon}
      />{" "}
      <button
        onClick={() => {
          const a = document.createElement("a");
          a.href = `/api/guilds/${guildId}/download-members`;
          a.download = `members_${guildId}.csv`;
          a.click();
        }}
        className={styles.downloadButton}
      >
        Download addresses
      </button>
      <section className={styles.configSection}>
        <h3>Configurations</h3>
        {configs.length > 0 ? (
          <ul className={styles.configList}>
            {configs.map((config) => (
              <li key={config.id} className={styles.configItem}>
                <div className={styles.configBlock}>
                  <strong>Starknet Network:</strong> {config.starknetNetwork}
                </div>
                <div className={styles.configBlock}>
                  <strong>Discord Role ID:</strong> {config.discordRoleId}
                </div>
                <div className={styles.configBlock}>
                  <strong>Starky Module Type:</strong> {config.starkyModuleType}
                </div>
                <div className={styles.configBlock}>
                  <strong>Starky Module Config:</strong>{" "}
                  <pre className={styles.configValue}>
                    {JSON.stringify(config.starkyModuleConfig, null, 2)}
                  </pre>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No configurations available for this guild.</p>
        )}
      </section>
      <SocialLinks />
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  query,
  res,
}) => {
  await setupDb();

  const { guildId, tokenId } = query;

  if (
    !guildId ||
    typeof guildId !== "string" ||
    !tokenId ||
    typeof tokenId !== "string"
  ) {
    if (res) res.statusCode = 400;
    return {
      props: {
        configs: [],
        guildId: "",
        error: "Missing or invalid guild or token ID.",
      },
    };
  }
  // ✅ Step: validate token
  const isValidToken = await validateDashboardToken(guildId, tokenId);

  if (!isValidToken) {
    if (res) res.statusCode = 403;
    return {
      props: {
        configs: [],
        guildId,
        error: "Invalid or expired token.",
      },
    };
  }

  const discordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!discordServer) {
    if (res) res.statusCode = 404;
    return {
      props: {
        configs: [],
        guildId,
        error: "Guild not found.",
      },
    };
  }

  const configs = await DiscordServerConfigRepository.findBy({
    discordServerId: guildId,
  });
  let discordServerName: string | null = null;
  let discordServerIcon: string | null = null;
  try {
    const info = await getDiscordServerInfo(guildId);
    discordServerName = info.name;
    if (info.icon) {
      const ext = info.icon.startsWith("a_") ? ".gif" : ".png";
      discordServerIcon = `https://cdn.discordapp.com/icons/${guildId}/${info.icon}${ext}`;
    }
  } catch (error) {
    console.error("Failed to fetch guild info:", error);
  }
  return {
    props: {
      configs: configs.map((c) => ({
        id: c.id,
        starknetNetwork: c.starknetNetwork,
        discordRoleId: c.discordRoleId,
        starkyModuleType: c.starkyModuleType,
        starkyModuleConfig: c.starkyModuleConfig,
      })),
      guildId,
      discordServerName,
      discordServerIcon,
    },
  };
};

export default DashboardPage;
