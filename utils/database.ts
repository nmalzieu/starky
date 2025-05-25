import {
  DiscordAnalyticsTokenRepository,
  DiscordDashboardTokenRepository,
} from "../db";

export const saveAnalyticsTokenToDatabase = async (
  guildId: string,
  userId: string,
  token: string
) => {
  try {
    const analyticsToken = DiscordAnalyticsTokenRepository.create({
      token,
      guildId,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days - 1 week
    });
    await DiscordAnalyticsTokenRepository.save(analyticsToken);
  } catch (error) {
    console.error("Error saving token:", error);
  }
};
export const saveDashboardTokenToDatabase = async (
  guildId: string,
  userId: string,
  token: string
) => {
  try {
    console.log(token);
    const dashboardToken = DiscordDashboardTokenRepository.create({
      token,
      guildId,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days - 1 week
    });
    const t = await DiscordDashboardTokenRepository.save(dashboardToken);
    console.log("t", t);
  } catch (error) {
    console.error("Error saving token:", error);
  }
};
