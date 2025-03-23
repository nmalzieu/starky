import type { NextApiRequest, NextApiResponse } from "next";
import { typedData } from "starknet";
import { Keypair } from "stellar-sdk";
import { DiscordMemberRepository, setupDb } from "../../db";
import { refreshDiscordMemberForAllConfigs } from "../../utils/discord/refreshRoles";
import messageToSign from "../../utils/starknet/message";
import { verifySignature as verifyStarknetSignature } from "../../utils/starknet/verifySignature";
import WatchTowerLogger from "../../watchTower";

type Data = { message: string; error?: string };
type VerifyRequest = {
  account: string;
  signature: string;
  discordServerId: string;
  discordMemberId: string;
  customLink: string;
  network: string;
};

const isValidStellarPublicKey = (publicKey: string): boolean => {
  return /^G[0-9A-Z]{55}$/.test(publicKey);
};

const verifyStellarSignature = async (
  publicKey: string,
  message: string,
  signature: string
): Promise<{ signatureValid: boolean; error?: string }> => {
  try {
    if (!isValidStellarPublicKey(publicKey)) {
      return { signatureValid: false, error: "Invalid Stellar public key" };
    }

    const messageBuffer = Buffer.from(message, "utf-8");
    const signatureBuffer = Buffer.from(signature, "base64");
    const keypair = Keypair.fromPublicKey(publicKey);

    const isValid = keypair.verify(messageBuffer, signatureBuffer);
    return { signatureValid: isValid };
  } catch (error) {
    return {
      signatureValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ message: "Method not allowed", error: "POST method required" });
    }

    await setupDb();

    const {
      account,
      signature,
      discordServerId,
      discordMemberId,
      customLink,
      network,
    } = req.body as VerifyRequest;

    if (
      !account ||
      !signature ||
      !discordServerId ||
      !discordMemberId ||
      !customLink ||
      !network
    ) {
      return res.status(400).json({
        message: "Invalid request",
        error:
          "Missing required fields: account, signature, discordServerId, discordMemberId, customLink & network",
      });
    }

    const validNetworks = [
      "stellar-mainnet",
      "stellar-testnet",
      "mainnet",
      "sepolia",
    ];
    if (!validNetworks.includes(network)) {
      return res
        .status(400)
        .json({ message: "Invalid request", error: "Unsupported network" });
    }

    const discordMember = await DiscordMemberRepository.findOne({
      where: { discordServerId, discordMemberId, starknetNetwork: network },
      relations: ["discordServer"],
    });

    if (!discordMember || discordMember.customLink !== customLink) {
      return res
        .status(400)
        .json({
          message: "Invalid request",
          error: "Discord member not found or incorrect custom link",
        });
    }

    const isStellarNetwork = network.startsWith("stellar");

    if (isStellarNetwork) {
      const { signatureValid, error } = await verifyStellarSignature(
        account,
        customLink,
        signature
      );
      if (!signatureValid) {
        WatchTowerLogger.error("Stellar signature verification failed", {
          error,
        });
        return res
          .status(400)
          .json({ message: "Signature verification failed", error });
      }
    } else {
      const messageHexHash = typedData.getMessageHash(messageToSign, account);

      let signatureArray: string[];
      try {
        signatureArray = JSON.parse(signature);
        if (!Array.isArray(signatureArray)) {
          signatureArray = [signature];
        }
      } catch (e) {
        signatureArray = [signature];
      }

      const { signatureValid, error } = await verifyStarknetSignature(
        account,
        messageHexHash,
        signatureArray,
        network
      );
      if (!signatureValid) {
        WatchTowerLogger.error("Starknet signature verification failed", {
          error,
        });
        return res
          .status(400)
          .json({ message: "Signature verification failed", error });
      }
    }

    discordMember.starknetWalletAddress = account;
    await DiscordMemberRepository.save(discordMember);

    try {
      await refreshDiscordMemberForAllConfigs(discordMember);
    } catch (error) {
      WatchTowerLogger.error("Failed to refresh Discord roles", { error });
    }

    res.status(200).json({ message: "Successfully verified" });
  } catch (error) {
    WatchTowerLogger.error("Internal Server Error", { error });
    res
      .status(500)
      .json({
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : String(error),
      });
  }
};

export default handler;
