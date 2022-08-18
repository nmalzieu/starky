import type { NextApiRequest, NextApiResponse } from "next";
import { typedData } from "starknet";
import { DiscordMemberRepository, setupDb } from "../../db";
import messageToSign from "../../starknet/message";
import { verifySignature } from "../../starknet/verifySignature";

type Data = {
  message: string;
};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  await setupDb();
  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST allowed" });
    return;
  }
  const body = req.body;
  if (
    !body.account ||
    !body.signature ||
    !body.discordServerId ||
    !body.discordMemberId ||
    !body.customLink
  ) {
    res.status(400).json({
      message:
        "Missing body: account, signature, discordServerId, discordMemberId & customLink required",
    });
    return;
  }

  const discordMember = await DiscordMemberRepository.findOne({
    where: { discordServerId: body.discordServerId, id: body.discordMemberId },
  });

  if (!discordMember || discordMember.customLink !== body.customLink) {
    res.status(400).json({
      message: "Wrong custom link",
    });
    return;
  }

  const messageHexHash = typedData.getMessageHash(messageToSign, body.account);
  const signatureVerified = await verifySignature(
    body.account,
    messageHexHash,
    body.signature,
    true
  );
  if (!signatureVerified) {
    return res.status(400).json({ message: "Signature is invalid" });
  } else {
    discordMember.starknetWalletAddress = body.account;
    await DiscordMemberRepository.save(discordMember);
    res.status(200).json({ message: "Successfully verified" });
  }
};

export default handler;
