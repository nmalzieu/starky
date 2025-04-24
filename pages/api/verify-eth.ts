import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "../../utils/ethereum/verfiySignature";
import { DiscordMemberRepository, setupDb } from "../../db";
import { refreshDiscordMemberForAllConfigs } from "../../utils/discord/refreshRoles";
import messageToSign from "../../utils/ethereum/message";

type Data = {
  message: string;
  error?: string;
};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  await setupDb();

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed",
      error: "POST method required",
    });
  }

  const body = req.body;
  if (
    !body.account ||
    !body.signature ||
    !body.discordServerId ||
    !body.discordMemberId ||
    !body.customLink ||
    !body.network
  ) {
    return res.status(400).json({
      message: "Incorrect body",
      error: `Missing required fields`,
    });
  }

  const discordMember = await DiscordMemberRepository.findOne({
    where: {
      discordServerId: body.discordServerId,
      discordMemberId: body.discordMemberId,
      starknetNetwork: body.network,
    },
    relations: ["discordServer"],
  });

  if (!discordMember || discordMember.customLink !== body.customLink) {
    return res.status(400).json({
      message: "Incorrect body",
      error: `Discord member not found or custom link is incorrect`,
    });
  }

  const message = {
    ...messageToSign,
    domain: {
      ...messageToSign.domain,
      chainId: body.network === "mainnet" ? 1 : 11155111, // 1 for mainnet, 5 for sepolia
    },
  };

  const { signatureValid, error } = await verifySignature(
    body.account,
    JSON.stringify(message.message),
    body.signature,
    message.domain.chainId
  );

  if (!signatureValid) {
    return res.status(400).json({ message: "Signature is invalid", error });
  }

  discordMember.starknetWalletAddress = body.account;
  await DiscordMemberRepository.save(discordMember);

  // Refresh roles
  await refreshDiscordMemberForAllConfigs(discordMember);

  return res.status(200).json({ message: "Successfully verified" });
};

export default handler;
