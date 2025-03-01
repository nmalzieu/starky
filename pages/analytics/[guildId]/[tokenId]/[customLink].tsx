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

import {
  DiscordMemberRepository,
  DiscordServerRepository,
  setupDb,
} from "../../../../db"; // Assuming these exist in your codebase

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
  guildId: string | null; // Guild ID
}

// Type for context parameter
interface AnalyticsPageContext extends NextPageContext {
  query: {
    guildId: string; // Fetch guildId directly from the query
    tokenId: string;
    customLink: string;
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
    <div style={{ width: "80%", margin: "0 auto", paddingTop: "2rem" }}>
      <h1 style={{ textAlign: "center" }}>
        Server Analytics for Guild: {guildId}
      </h1>
      {userStats && Object.keys(userStats).length > 0 ? (
        <div style={{ width: "100%", height: "400px", marginTop: "20px" }}>
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
    </div>
  );
};

export const getServerSideProps = async ({
  res,
  query,
}: AnalyticsPageContext) => {
  await setupDb(); // Initialize the database
  const { guildId } = query;

  // Validate guildId
  if (!guildId) {
    if (res) {
      res.setHeader("location", "/");
      res.statusCode = 302;
      res.end();
    }
    return { props: {} }; // Redirect to home if guildId is missing
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
