import { useCallback, useEffect, useState } from "react";
import {
  getAddress,
  getNetwork,
  signMessage as stellarSignMessage,
} from "@stellar/freighter-api";
import axios from "axios";
import { useRouter } from "next/router";
import { Signature } from "starknet";
import { connect as starknetConnect, disconnect } from "starknetkit";
import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import chainAliasByNetwork from "../../../../configs/chainAliasByNetwork.json";
import networkConfig from "../../../../configs/networks.json";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerName } from "../../../../discord/utils";
import { Props } from "../../../../types/props";
import { StarknetAccount } from "../../../../types/starknet";
import { StellarAccount } from "../../../../types/stellar";
import messageToSign from "../../../../utils/starknet/message";
import WatchTowerLogger from "../../../../watchTower";

import styles from "../../../../styles/Verify.module.scss";

interface NetworkConfig {
  name: string;
  url: string;
  indexer: boolean;
  chain?: "starknet" | "stellar";
  description: string;
}

const typedNetworkConfig = networkConfig as NetworkConfig[];

const getSignatureErrorMessage = (
  error: string
): {
  short: string;
  advanced?: string;
} => {
  if (error.includes("Contract not found") || error.includes("UNINITIALIZED"))
    return {
      short:
        "your wallet is not yet initialized, please make a transaction (sending ETH to yourself works) to initialize it",
      advanced: error,
    };
  return {
    short: "your signature could not be verified, please try again",
    advanced: error,
  };
};

const cleanDiscordId = (id: string | string[] | undefined): string => {
  if (!id) return "";
  const strId = Array.isArray(id) ? id[0] : id;
  return strId.replace(/\D/g, "");
};

const VerifyPage = ({ discordServerName, starknetNetwork }: Props) => {
  const router = useRouter();
  const {
    discordServerId: rawServerId,
    discordMemberId: rawMemberId,
    customLink,
  } = router.query;

  const discordServerId = cleanDiscordId(rawServerId);
  const discordMemberId = cleanDiscordId(rawMemberId);

  const [account, setAccount] = useState<
    StarknetAccount | StellarAccount | undefined
  >(undefined);
  const [wallet, setWallet] = useState<any>(null);
  const [noWallet, setNoWallet] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [verifyingSignature, setVerifyingSignature] = useState(false);
  const [verifiedSignature, setVerifiedSignature] = useState(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState("");
  const [chainId, setChainId] = useState("");
  const [currentChain, setCurrentChain] = useState<"starknet" | "stellar">(
    "starknet"
  );

  useEffect(() => {
    if (!typedNetworkConfig) return;
    const network = typedNetworkConfig.find(
      (net: NetworkConfig) => net.name === starknetNetwork
    );
    if (network) setCurrentChain(network.chain || "starknet");
  }, [starknetNetwork]);

  const connectToStarknet = useCallback(async () => {
    const { wallet } = await starknetConnect();
    if (!wallet) {
      setNoWallet(true);
      return;
    }
    setWallet(wallet);
    WatchTowerLogger.info("Wallet information", wallet);
    const chain =
      wallet.account.provider.chainId ||
      wallet.provider.chainId ||
      wallet.chainId;
    setChainId(chain);
    if (
      starknetNetwork !==
      Object.keys(chainAliasByNetwork)[
        Object.values(chainAliasByNetwork).findIndex((aliases) =>
          aliases.includes(chain)
        )
      ]
    )
      setWrongNetwork(true);
    else setAccount({ address: wallet.account.address, network: chain });
  }, [starknetNetwork]);

  const connectToStellar = useCallback(async () => {
    try {
      const publicKey = await getAddress();
      const network = await getNetwork();

      setAccount({
        publicKey:
          typeof publicKey === "string" ? publicKey : String(publicKey),
        network: typeof network === "string" ? network : String(network),
      });
    } catch (error) {
      setNoWallet(true);
    }
  }, []);

  const verifySignature = useCallback(
    async (signature: Signature | string) => {
      if (!account) return;
      setUnverifiedSignature("");
      setVerifyingSignature(true);
      try {
        await axios.post("/api/verify", {
          account: "publicKey" in account ? account.publicKey : account.address,
          signature,
          discordServerId,
          discordMemberId,
          customLink,
          network: starknetNetwork,
        });
        setVerifiedSignature(true);
        setVerifyingSignature(false);
      } catch (e: any) {
        WatchTowerLogger.error(
          "Signature verification failed with data",
          e.response?.data
        );
        setVerifyingSignature(false);
        setUnverifiedSignature(`
          ${e.response?.data?.message}.
          ${e.response?.data?.error}
        `);
      }
    },
    [customLink, discordMemberId, discordServerId, account, starknetNetwork]
  );

  const sign = useCallback(async () => {
    if (!account) return;
    try {
      let signature;

      if ("publicKey" in account) {
        // Stellar signing
        const message = `Verifying my identity for ${discordServerName}`;
        signature = await stellarSignMessage(message, {
          address: account.publicKey,
        });
      } else {
        // Starknet signing
        if (!wallet?.account) {
          throw new Error("Wallet not connected");
        }

        // First check if account is initialized
        try {
          await wallet.account.getNonce();
        } catch (e) {
          throw new Error(
            "Wallet not initialized. Please make a transaction first."
          );
        }

        const messageCopy = {
          ...messageToSign,
          domain: { ...messageToSign.domain, chainId },
        };

        signature = await wallet.account.signMessage(messageCopy);
      }

      if (signature) {
        await verifySignature(signature);
      }
    } catch (e: any) {
      WatchTowerLogger.error(e.message, e);
      setUnverifiedSignature(
        e.message.includes("Contract not found") ||
          e.message.includes("UNINITIALIZED") ||
          e.message.includes("Wallet not initialized")
          ? "your wallet is not yet initialized, please make a transaction (sending ETH to yourself works) to initialize it"
          : e.message
      );
    }
  }, [account, chainId, verifySignature, wallet, discordServerName]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setAccount(undefined);
      setWallet(null);
      setVerifiedSignature(false);
    } catch (error) {
      WatchTowerLogger.error("Disconnect error");
    }
  }, []);

  const displayWalletAddress = (
    account: StarknetAccount | StellarAccount | undefined
  ) => {
    if (!account) return "Unknown";

    try {
      return "publicKey" in account
        ? account.publicKey // Ensure publicKey is properly extracted for Stellar
        : account.address;
    } catch (e) {
      console.error("Error displaying wallet address:", e);
      return "Error displaying address";
    }
  };

  let walletDiv = (
    <div>
      {!account && (
        <div>
          <a
            className={styles.connect}
            onClick={
              currentChain === "starknet" ? connectToStarknet : connectToStellar
            }
          >
            connect {currentChain} wallet
          </a>
          {wrongNetwork && (
            <div className="danger">
              this discord server has been configured to verify identity on the{" "}
              {starknetNetwork} network.
              <br />
              please switch your browser wallet to the {starknetNetwork} network
              then connect again
            </div>
          )}
        </div>
      )}
      {account && !verifyingSignature && !verifiedSignature && (
        <a className={styles.sign} onClick={sign}>
          sign a message to verify your identity
        </a>
      )}
      {verifyingSignature && (
        <span className={styles.sign}>verifying your signature...</span>
      )}
      {unverifiedSignature && (
        <div className="danger">
          {getSignatureErrorMessage(unverifiedSignature).short}
          <br />
          {getSignatureErrorMessage(unverifiedSignature).advanced && (
            <span className={styles.advancedErrorMessage}>
              advanced: {getSignatureErrorMessage(unverifiedSignature).advanced}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (noWallet) {
    walletDiv = <div>no {currentChain} wallet detected on your browser.</div>;
  }

  return (
    <div className={styles.verify}>
      <Logo />
      <div>
        Discord server: <b>{discordServerName}</b>
        <br />
        Network: <b>{starknetNetwork}</b>
        <br />
        {account && (
          <span className={styles.wallet}>
            {currentChain} wallet: <b>{displayWalletAddress(account)}</b>{" "}
            <a onClick={handleDisconnect}>disconnect</a>
          </span>
        )}
        <br />
        {verifiedSignature && (
          <div>
            <span>
              Identity: <b>verified</b>
            </span>
            <h1>YOU&apos;RE ALL SET FREN</h1>
            <span>you shall close this tab</span>
          </div>
        )}
        {!verifiedSignature && walletDiv}
      </div>
      {process.env.NEXT_PUBLIC_STARKY_OFFICIAL && <SocialLinks />}
    </div>
  );
};

export async function getServerSideProps({ res, query }: any) {
  await setupDb();
  let discordServerName = null;

  const discordServerId = cleanDiscordId(query.discordServerId);
  const discordMemberId = cleanDiscordId(query.discordMemberId);
  const customLink = query.customLink;

  const discordMember = await DiscordMemberRepository.findOne({
    where: {
      customLink,
      discordServerId,
      discordMemberId,
    },
    relations: ["discordServer"],
  });

  if (!discordMember || discordMember.customLink !== customLink) {
    res.setHeader("location", "/");
    res.statusCode = 302;
    res.end();
    return { props: {} };
  }

  try {
    discordServerName = await getDiscordServerName(discordServerId);
  } catch (e: any) {
    WatchTowerLogger.error(e.message, e);
  }

  return {
    props: {
      discordServerName,
      starknetNetwork: discordMember.starknetNetwork,
    },
  };
}

export default VerifyPage;
