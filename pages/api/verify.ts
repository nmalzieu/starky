import type { NextApiRequest, NextApiResponse } from "next";
import { typedData } from "starknet";

import { refreshDiscordMember } from "../../cron";
import { DiscordMemberRepository, setupDb } from "../../db";
import { DiscordServerConfigRepository } from "../../db/index";
import modules from "../../starkyModules";
import messageToSign from "../../utils/starknet/message";
import { verifySignature } from "../../utils/starknet/verifySignature";

type Data = {
  message: string;
  error?: string;
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
    !body.customLink ||
    !body.network
  ) {
    res.status(400).json({
      message:
        "Missing body: account, signature, discordServerId, discordMemberId, customLink & network required",
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
      message: "Wrong custom link",
    });
    return;
  }
  const discordConfigs = await DiscordServerConfigRepository.findBy({
    discordServerId: discordMember.discordServerId,
    starknetNetwork: body.network,
  });

  const messageHexHash = typedData.getMessageHash(messageToSign, body.account);
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
    // Let's refresh its status immediatly
    DiscordMemberRepository.save(discordMember);

    for (let discordConfig of discordConfigs) {
      await refreshDiscordMember(
        discordConfig,
        discordMember,
        modules[discordConfig.starkyModuleType]
      );
    }
  }
};

export default handler;
