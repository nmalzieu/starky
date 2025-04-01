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
import RedirectMessage from "../../../components/RedirectMessage";

import {
  DiscordMemberRepository,
  DiscordServerRepository,
  setupDb,
} from "../../../db"; // Adjust based on your structure

import styles from "../../../styles/Verify.module.scss";
import { validateToken } from "../../../utils/validateToken";

// Register necessary chart components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale
);

interface AnalyticsPageProps {
  userStats: Record<string, number>;
  guildId: string;
  tokenExpired?: boolean;
}

interface AnalyticsPageContext extends NextPageContext {
  query: {
    guildId: string;
    tokenId: string;
  };
}

const AnalyticsPage = ({
  userStats,
  guildId,
  tokenExpired,
}: AnalyticsPageProps) => {
  if (tokenExpired) {
    return (
      <RedirectMessage
        title="Session Expired"
        description="Your access token has expired. Redirecting to the request page."
        buttonLabel="Request New Link"
        buttonLink="/request-link"
        redirectTo="/request-link"
        delay={5000}
      />
    );
  }

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
        Server Analytics for Guild:<b> {guildId}</b>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <b>Distribution of networks among connected wallets:</b>
      </div>

      {Object.keys(userStats).length > 0 ? (
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
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const isValidToken = await validateToken(guildId, tokenId);

  if (!isValidToken) {
    return {
      props: { tokenExpired: true }, // Show ExpiredAnalyticsPage
    };
  }

  const discordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!discordServer) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const members = await DiscordMemberRepository.findBy({
    discordServerId: guildId,
  });

  const userStats: Record<string, number> = {};

  members.forEach((member) => {
    const network = member.starknetNetwork.toLowerCase();
    userStats[network] = (userStats[network] || 0) + 1;
  });

  const formattedUserStats = Object.fromEntries(
    Object.entries(userStats).map(([network, count]) => [
      network.charAt(0).toUpperCase() + network.slice(1),
      count,
    ])
  );

  return {
    props: { userStats: formattedUserStats, guildId },
  };
};

export default AnalyticsPage;
