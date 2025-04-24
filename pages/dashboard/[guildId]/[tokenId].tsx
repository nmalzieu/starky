import React from "react";
import { NextPage, GetServerSideProps } from "next";
import Logo from "../../../components/Logo";
import SocialLinks from "../../../components/SocialLinks";
import styles from "../../../styles/Dashboard.module.scss";

import {
  setupDb,
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "../../../db";
import { StarkyModuleConfig } from "../../../types/starkyModules";

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
  error?: string;
}

const DashboardPage: NextPage<DashboardPageProps> = ({
  configs,
  guildId,
  error,
}) => {
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
      <h2>Guild: {guildId}</h2>
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

  const { guildId } = query;

  if (!guildId || typeof guildId !== "string") {
    if (res) res.statusCode = 400;
    return {
      props: {
        configs: [],
        guildId: "",
        error: "Missing or invalid guild ID.",
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
    },
  };
};

export default DashboardPage;
