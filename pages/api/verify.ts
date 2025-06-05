import type { NextApiRequest, NextApiResponse } from "next";
import { typedData } from "starknet";

import { DiscordMemberRepository, setupDb } from "../../db";
import { refreshDiscordMemberForAllConfigs } from "../../utils/discord/refreshRoles";
import messageToSign from "../../utils/starknet/message";
import { verifySignature } from "../../utils/starknet/verifySignature";

import chainAliasByNetwork from "../../configs/chainAliasByNetwork.json";

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
    !body.signature ||
    !body.discordServerId ||
    !body.discordMemberId ||
    !body.customLink ||
    !body.network
  ) {
    res.status(400).json({
      message: "Incorrect body",
      error: `Missing body: account, signature, discordServerId, discordMemberId, customLink & network required. Provided: ${JSON.stringify(
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

  const message =
    body.network === "sepolia"
      ? {
          ...messageToSign,
          domain: {
            ...messageToSign.domain,
            chainId: chainAliasByNetwork["sepolia"][1],
          },
        }
      : messageToSign;

  const messageHexHash = typedData.getMessageHash(message, body.account);

  const { signatureValid, error } = await verifySignature(
    body.account,
    messageHexHash,
    body.signature,
    body.network
  );
  if (!signatureValid) {
    return res.status(400).json({ message: "Signature is invalid", error });
  } else {
    discordMember.starknetWalletAddress = body.account;

    res.status(200).json({ message: "Successfully verified" });
    DiscordMemberRepository.save(discordMember);
    // Let's refresh its status immediatly
    await refreshDiscordMemberForAllConfigs(discordMember);
  }
};

export default handler;
