import type { NextApiRequest, NextApiResponse } from "next";
import { hashMessage } from "ethers";

import { DiscordMemberRepository, setupDb } from "../../db";
import { refreshDiscordMemberForAllConfigs } from "../../utils/discord/refreshRoles";
import messageToSign from "../../utils/ethereum/message";
import { verifySignature } from "../../utils/ethereum/verfiySignature";

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
      error: `Missing body: account, signature, discordServerId, discordMemberId, customLink & network required. Provided: ${JSON.stringify(
        body
      )}`,
    });
  }

  const discordMember = await DiscordMemberRepository.findOne({
    where: {
      discordServerId: body.discordServerId,
      discordMemberId: body.discordMemberId,
      ethereumNetwork: body.network,
    },
    relations: ["discordServer"],
  });

  if (!discordMember || discordMember.customLink !== body.customLink) {
    return res.status(400).json({
      message: "Incorrect body",
      error: `Discord member not found or custom link is incorrect`,
    });
  }

  const messageHash = hashMessage(messageToSign);

  const { signatureValid, error } = await verifySignature(
    body.account,
    messageHash,
    body.signature,
    body.network
  );

  if (!signatureValid) {
    return res.status(400).json({ message: "Signature is invalid", error });
  } else {
    discordMember.ethereumWalletAddress = body.account;

    res.status(200).json({ message: "Successfully verified" });
    await DiscordMemberRepository.save(discordMember);

    // Refresh member status immediately
    await refreshDiscordMemberForAllConfigs(discordMember);
  }
};

export default handler;
