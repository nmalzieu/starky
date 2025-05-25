import { NextApiRequest, NextApiResponse } from "next";
import { setupDb, DiscordMemberRepository } from "../../../../db";
import { validateDashboardToken } from "../../../../utils/validateDashboardToken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await setupDb();
  const { guildId, token } = req.query;

  if (!guildId || typeof guildId !== "string") {
    res.status(400).json({ error: "Missing or invalid guild ID" });
    return;
  }

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Missing or invalid token" });
    return;
  }

  const isValidToken = await validateDashboardToken(guildId, token);
  if (!isValidToken) {
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const members = await DiscordMemberRepository.find({
      where: { discordServerId: guildId },
    });

    const header = [
      "discordMemberId",
      "discordServerId",
      "starknetNetwork",
      "starknetWalletAddress",
    ];

    const rows = members.map((m) =>
      [
        m.discordMemberId,
        m.discordServerId,
        m.starknetNetwork,
        m.starknetWalletAddress ?? "",
      ]
        .map((value) => `"${(value ?? "").toString().replace(/"/g, '""')}"`) // Escape quotes
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=members_${guildId}.csv`
    );
    res.status(200).send(csv);
  } catch (err) {
    console.error("Error generating CSV:", err);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
}
