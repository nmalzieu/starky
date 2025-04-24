import React from "react";
import { Pie } from "react-chartjs-2";

import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { NextPageContext } from "next";

import Logo from "../../../components/Logo";
import SocialLinks from "../../../components/SocialLinks";
import {
  DiscordMemberRepository,
  DiscordServerRepository,
  setupDb,
} from "../../../db";

import styles from "../../../styles/Verify.module.scss";
import { validateToken } from "../../../utils/validateToken";

// Register chart components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale
);

// Props
interface AnalyticsPageProps {
  userStats: Record<string, number>;
  guildName: string; // Use guild name instead of ID
}

interface AnalyticsPageContext extends NextPageContext {
  query: {
    guildId: string;
    tokenId: string;
  };
}

const AnalyticsPage = ({ userStats, guildName }: AnalyticsPageProps) => {
  const data = {
    labels: Object.keys(userStats),
    datasets: [
      {
        data: Object.values(userStats),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
      },
    ],
  };

  return (
    <div>
      <div className={styles.verify}>
        <Logo />
      </div>
      <div className={styles.serverInfo}>
        Server Analytics for Guild: <b>{guildName}</b>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <b>Distribution of networks among connected wallets:</b>
      </div>

      {userStats && Object.keys(userStats).length > 0 ? (
        <div style={{ width: "30%", height: "250px", marginTop: "20px" }}>
          <Pie
            data={data}
            options={{
              responsive: true,
              plugins: { legend: { position: "top" } },
            }}
          />
        </div>
      ) : (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          No data available for the selected guild.
        </p>
      )}
      <div style={{ marginTop: "2rem" }}>
        <SocialLinks />
      </div>
    </div>
  );
};

export const getServerSideProps = async ({
  res,
  query,
}: AnalyticsPageContext) => {
  await setupDb();
  const { guildId, tokenId } = query;

  if (!guildId || !tokenId) {
    if (res) {
      res.setHeader("location", "/");
      res.statusCode = 302;
      res.end();
    }
    return { props: {} };
  }

  const isValidToken = await validateToken(guildId, tokenId);
  if (!isValidToken) {
    if (res) {
      res.setHeader("location", "/");
      res.statusCode = 302;
      res.end();
    }
    return { props: {} };
  }

  const discordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });
  if (!discordServer) {
    if (res) {
      res.setHeader("location", "/");
      res.statusCode = 302;
      res.end();
    }
    return { props: {} };
  }

  const members = await DiscordMemberRepository.findBy({
    discordServerId: guildId,
  });

  const userStats: Record<string, number> = {
    mainnet: 0,
    sepolia: 0,
  };

  if (members && members.length > 0) {
    members.forEach((member) => {
      const network = member.starknetNetwork.toLowerCase();
      if (userStats.hasOwnProperty(network)) {
        userStats[network] += 1;
      } else {
        userStats[network] = 1;
      }
    });
  }

  const formattedUserStats: Record<string, number> = {};
  Object.entries(userStats).forEach(([network, count]) => {
    const formattedNetwork = network.charAt(0).toUpperCase() + network.slice(1);
    formattedUserStats[formattedNetwork] = count;
  });

  return {
    props: {
      userStats: formattedUserStats,
      guildName: discordServer, //  Pass guild name instead of ID
    },
  };
};

export default AnalyticsPage;
