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
} from "../../../db"; // Assuming these exist in your codebase

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

// Type for props
interface AnalyticsPageProps {
  userStats: Record<string, number>; // Number of users connected to each network
  guildId: string; // Guild ID
}

// Type for context parameter
interface AnalyticsPageContext extends NextPageContext {
  query: {
    guildId: string; // Fetch guildId directly from the query
    tokenId: string;
  };
}

const AnalyticsPage = ({ userStats, guildId }: AnalyticsPageProps) => {
  // Prepare data for the pie chart
  const data = {
    labels: Object.keys(userStats), // Network names (e.g., Mainnet, Sepolia)
    datasets: [
      {
        data: Object.values(userStats), // Number of users per network
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"], // Pie chart colors
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
  await setupDb(); // Initialize the database
  const { guildId, tokenId } = query; // Now directly accessing query parameters

  // Validate guildId and tokenId
  if (!guildId || !tokenId) {
    if (res) {
      res.setHeader("location", "/");
      res.statusCode = 302;
      res.end();
    }
    return { props: {} }; // Redirect to home if guildId or tokenId is missing
  }

  // Verify token validity
  const isValidToken = await validateToken(
    guildId as string,
    tokenId as string
  );

  if (!isValidToken) {
    if (res) {
      res.setHeader("location", "/");
      res.statusCode = 302;
      res.end();
    }
    return { props: {} }; // Redirect to home if token is invalid or expired
  }

  // Verify if the guild exists
  const discordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!discordServer) {
    if (res) {
      res.setHeader("location", "/");
      res.statusCode = 302;
      res.end();
    }
    return { props: {} }; // Redirect to home if no matching server found
  }

  // Get all members for this guild
  const members = await DiscordMemberRepository.findBy({
    discordServerId: guildId,
  });

  // Initialize user stats for the networks
  const userStats: Record<string, number> = {
    mainnet: 0,
    sepolia: 0,
    // Add more networks here if necessary
  };

  // Populate user stats based on members' networks
  if (members && members.length > 0) {
    members.forEach((member) => {
      const network = member.starknetNetwork.toLowerCase();
      if (userStats.hasOwnProperty(network)) {
        userStats[network] += 1;
      } else {
        // Handle other networks if needed
        userStats[network] = 1;
      }
    });
  }

  // Format network names for display
  const formattedUserStats: Record<string, number> = {};
  Object.entries(userStats).forEach(([network, count]) => {
    // Capitalize the first letter of each network name
    const formattedNetwork = network.charAt(0).toUpperCase() + network.slice(1);
    formattedUserStats[formattedNetwork] = count;
  });

  return {
    props: {
      userStats: formattedUserStats, // Pass user stats with formatted network names
      guildId, // Pass guildId to the frontend
    },
  };
};

export default AnalyticsPage;
