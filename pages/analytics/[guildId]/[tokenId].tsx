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
} from "../../../db";

import styles from "../../../styles/Verify.module.scss";
import { validateToken } from "../../../utils/validateToken";
import { getDiscordServerInfo } from "../../../discord/utils";

// Register chart components
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
  discordServerIcon?: string | null; 


  tokenExpired?: boolean;
  serverNotFound?: boolean;

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

  discordServerIcon,
}: AnalyticsPageProps) => {
  // Prepare data for the pie chart

  tokenExpired,
  serverNotFound,
}: AnalyticsPageProps) => {
  if (tokenExpired) {
    return (
      <RedirectMessage
        title="Session Expired"
        description="Your access token has expired. You’ll be redirected shortly."
        redirectTo="/"
      />
    );
  }

  if (serverNotFound) {
    return (
      <RedirectMessage
        title="Server Not Found"
        description="We could not find the server associated with this link. Redirecting to the home page."
        redirectTo="/"
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
        Server Analytics for Guild:
        {discordServerIcon && (
          <img
            src={discordServerIcon}
            alt="Server Icon"
            style={{
              width: "24px",
              height: "24px",
              marginLeft: "8px",
              verticalAlign: "middle",
              borderRadius: "50%",
            }}
          />
        )}
        <b> {guildId}</b>
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

export const getServerSideProps = async ({ query }: AnalyticsPageContext) => {
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
      props: { tokenExpired: true },
    };
  }

  const discordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!discordServer) {
    return {
      props: { serverNotFound: true },
    };
  }


  // Get server info including icon
  let discordServerIcon = null;
  try {
    const serverInfo = await getDiscordServerInfo(guildId as string);
    discordServerIcon = serverInfo.icon
      ? `https://cdn.discordapp.com/icons/${guildId}/${serverInfo.icon}${
          serverInfo.icon.startsWith("a_") ? ".gif" : ".png"
        }`
      : null;
  } catch (e: any) {
    console.error("Error fetching server info:", e);
  }

  // Get all members for this guild

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

    props: {
      userStats: formattedUserStats,
      guildId, 
      discordServerIcon, 
        formattedUserStats
    },


  };
};

export default AnalyticsPage;
