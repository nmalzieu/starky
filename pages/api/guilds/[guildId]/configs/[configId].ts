import { NextApiRequest, NextApiResponse } from "next";
import {
  DiscordServerConfigRepository,
  DiscordServerRepository,
} from "../../../../../db";
import { validateDashboardToken } from "../../../../../utils/validateDashboardToken";
import WatchTowerLogger from "../../../../../watchTower";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { guildId, configId, token } = req.query;

  if (
    !guildId ||
    typeof guildId !== "string" ||
    !configId ||
    typeof configId !== "string" ||
    !token ||
    typeof token !== "string"
  ) {
    return res.status(400).json({
      error: "Missing or invalid guild ID, config ID, or token",
    });
  }

  // Validate token
  const isValidToken = await validateDashboardToken(guildId, token);
  if (!isValidToken) {
    return res.status(403).json({
      error: "Invalid or expired token",
    });
  }

  // Check if the guild exists
  const discordServer = await DiscordServerRepository.findOneBy({
    id: guildId,
  });

  if (!discordServer) {
    return res.status(404).json({
      error: "Guild not found",
    });
  }

  // Handle different HTTP methods
  if (req.method === "GET") {
    // Get the config
    try {
      const config = await DiscordServerConfigRepository.findOneBy({
        id: configId,
        discordServerId: guildId,
      });

      if (!config) {
        return res.status(404).json({
          error: "Configuration not found",
        });
      }

      return res.status(200).json({
        id: config.id,
        starknetNetwork: config.starknetNetwork,
        discordRoleId: config.discordRoleId,
        starkyModuleType: config.starkyModuleType,
        starkyModuleConfig: config.starkyModuleConfig,
      });
    } catch (error) {
      WatchTowerLogger.error("Error fetching config:", { error });
      return res.status(500).json({
        error: "Failed to fetch configuration",
      });
    }
  } else if (req.method === "PUT") {
    // Update the config
    try {
      const config = await DiscordServerConfigRepository.findOneBy({
        id: configId,
        discordServerId: guildId,
      });

      if (!config) {
        return res.status(404).json({
          error: "Configuration not found",
        });
      }

      const {
        starknetNetwork,
        discordRoleId,
        starkyModuleType,
        starkyModuleConfig,
      } = req.body;

      // Update fields if provided
      if (starknetNetwork) {
        config.starknetNetwork = starknetNetwork;
      }

      if (discordRoleId) {
        config.discordRoleId = discordRoleId;
      }

      if (starkyModuleType) {
        config.starkyModuleType = starkyModuleType;
      }

      if (starkyModuleConfig) {
        config.starkyModuleConfig = starkyModuleConfig;
      }

      // Save the updated config
      await DiscordServerConfigRepository.save(config);

      return res.status(200).json({
        id: config.id,
        starknetNetwork: config.starknetNetwork,
        discordRoleId: config.discordRoleId,
        starkyModuleType: config.starkyModuleType,
        starkyModuleConfig: config.starkyModuleConfig,
      });
    } catch (error) {
      WatchTowerLogger.error("Error updating config:", { error });
      return res.status(500).json({
        error: "Failed to update configuration",
      });
    }
  } else {
    // Method not allowed
    return res.status(405).json({
      error: "Method not allowed",
    });
  }
}
