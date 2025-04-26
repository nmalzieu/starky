import type { NextApiRequest, NextApiResponse } from "next";
import { typedData } from "starknet";

import { DiscordMemberRepository, setupDb } from "../../db";
import { refreshDiscordMemberForAllConfigs } from "../../utils/discord/refreshRoles";
import messageToSign from "../../utils/starknet/message";
import { verifySignature } from "../../utils/starknet/verifySignature";

type Data = {
  message: string;
  error?: string;
};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  await setupDb();
  if (req.method !== "POST") {
    res
      .status(405)
      .json({ message: "Method not allowed", error: "POST method required" });
    return;
  }
  const body = req.body;
  if (
    !body.account ||
    !body.chain || // Added chain to the body
    !body.discordServerId ||
    !body.discordMemberId ||
    !body.customLink ||
    !body.network
  ) {
    res.status(400).json({
      message: "Incorrect body",
      error: `Missing body: account, chain, discordServerId, discordMemberId, customLink & network required. Provided: ${JSON.stringify(
        body
      )}`,
    });
    return;
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
    res.status(400).json({
      message: "Incorrect body",
      error: `Discord member not found or custom link is incorrect`,
    });
    return;
  }

  if (body.chain === "starknet") {
    if (!body.signature) {
      res.status(400).json({
        message: "Incorrect body",
        error: "Signature required for Starknet",
      });
      return;
    }

    const messageHexHash = typedData.getMessageHash(
      messageToSign,
      body.account
    );
    const { signatureValid, error } = await verifySignature(
      body.account,
      messageHexHash,
      body.signature,
      body.network
    );
    if (!signatureValid) {
      return res.status(400).json({ message: "Signature is invalid", error });
    }

    discordMember.starknetWalletAddress = body.account;
  } else if (body.chain === "stellar") {
    discordMember.starknetWalletAddress = body.account;
  } else {
    res.status(400).json({
      message: "Unsupported chain",
      error: `Chain ${body.chain} is not supported`,
    });
    return;
  }

  await DiscordMemberRepository.save(discordMember);
  await refreshDiscordMemberForAllConfigs(discordMember);
  res.status(200).json({ message: "Successfully verified" });
};

export default handler;
