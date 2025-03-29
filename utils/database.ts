import { DiscordAnalyticsTokenRepository, DiscordDashboardTokenRepository } from "../db";

type AccessType = "analytics" | "dashboard";

export const saveTokenToDatabase = async (
  guildId: string,
  userId: string,
  token: string,
  accessType: AccessType,
) => {
  try {
    if (accessType == "dashboard"){
      const dashbaordToken = DiscordDashboardTokenRepository.create({
        token,
        guildId,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days - 1 week
      });
      await DiscordAnalyticsTokenRepository.save(dashbaordToken);
    }
    else{
      const analyticsToken = DiscordAnalyticsTokenRepository.create({
        token,
        guildId,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days - 1 week
      });
      await DiscordAnalyticsTokenRepository.save(analyticsToken);
    }
  } catch (error) {
    console.error("Error saving token:", error);
  }
};
