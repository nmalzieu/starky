import { DiscordAnalyticsTokenRepository } from "../db";

export const validateToken = async (
  guildId: string,
  tokenId: string
): Promise<boolean> => {
  try {
    const token = await DiscordAnalyticsTokenRepository.findOne({
      where: { guildId, token: tokenId },
    });

    if (!token) return false; // Token not found

    // Check if token is expired
    if (new Date() > new Date(token.expiresAt)) {
      await DiscordAnalyticsTokenRepository.delete({ guildId, token: tokenId }); // Remove expired token
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
};
