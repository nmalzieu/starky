import type { NextApiRequest, NextApiResponse } from "next";
import { typedData } from "starknet";
import { refreshDiscordMember } from "../../cron";
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
  //console.log(body);
  if (
    !body.account ||
    !body.signature ||
    !body.discordServerId ||
    !body.discordMemberId ||
    !body.customLink
  ) {
    res.status(400).json({
      message:
        "Missing body: account, signature, DiscordServerId, discordMemberId & customLink required",
    });
    return;
  }

  const discordMembers = await DiscordMemberRepository.find({
    where: {
      DiscordServerId: body.discordServerId,
      discordMemberId: body.discordMemberId,
    },
    relations: ["DiscordServerConfig"],
  });

  for (let discordMember of discordMembers) {
    if (!discordMember || discordMember.customLink !== body.customLink) {
      res.status(400).json({
        message: "Wrong custom link",
      });
      return;
    }

    const messageHexHash = typedData.getMessageHash(
      messageToSign,
      body.account
    );
    const signatureVerified = await verifySignature(
      body.account,
      messageHexHash,
      body.signature,
      discordMember.DiscordServerConfig.starknetNetwork
    );
    if (!signatureVerified) {
      return res.status(400).json({ message: "Signature is invalid" });
    } else {
      discordMember.starknetWalletAddress = body.account;

      res.status(200).json({ message: "Successfully verified" });
      // Let's refresh its status immediatly
      DiscordMemberRepository.save(discordMembers);
      refreshDiscordMember(discordMember.DiscordServerConfig, discordMember);
    }
  }
};

export default handler;
