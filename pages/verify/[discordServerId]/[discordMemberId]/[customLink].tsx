import { useCallback, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/router";
import { Signature } from "starknet";
import {
  connect as starknetConnect,
  disconnect as starknetDisconnect,
} from "starknetkit";
import { Keypair } from "stellar-sdk";

import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import chainAliasByNetwork from "../../../../configs/chainAliasByNetwork.json";
import networks from "../../../../configs/networks.json";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerInfo } from "../../../../discord/utils";
import { NetworkName } from "../../../../types/starknet";
import messageToSign from "../../../../utils/starknet/message";
import WatchTowerLogger from "../../../../watchTower";

import styles from "../../../../styles/Verify.module.scss";

type Props = {
  discordServerName: string;
  discordServerIcon?: string | null;
  starknetNetwork: NetworkName;
};

const getSignatureErrorMessage = (error: string) => {
  if (error.includes("Contract not found") || error.includes("UNINITIALIZED"))
    return {
      short:
        "Your wallet is not yet initialized. Please make a transaction to initialize it.",
      advanced: error,
    };
  return {
    short: "Your signature could not be verified. Please try again.",
    advanced: error,
  };
};

const VerifyPage = ({
  discordServerName,
  discordServerIcon,
  starknetNetwork,
}: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const [account, setAccount] = useState<any>(undefined);
  const [noWallet, setNoWallet] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [verifyingSignature, setVerifyingSignature] = useState(false);
  const [verifiedSignature, setVerifiedSignature] = useState(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState("");
  const [chainId, setChainId] = useState("");
  const [isArgent, setIsArgent] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stellarAccount, setStellarAccount] = useState<{
    publicKey: string;
    secretKey: string;
  } | null>(null);

  const networkConfig = networks.find((net) => net.name === customLink);
  const isStellarNetwork = networkConfig?.chain === "stellar";
  const isStarknetNetwork =
    !networkConfig?.chain || networkConfig.chain === "starknet";

  const connectToStarknet = useCallback(async () => {
    const { wallet } = await starknetConnect();
    if (!wallet) {
      setNoWallet(true);
      return;
    }
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
    else setAccount(wallet.account);

    const isArgentWallet = wallet.id.toLowerCase().includes("argent");
    setIsArgent(isArgentWallet);

    const currentChainId =
      wallet.account?.provider.chainId ||
      wallet.provider?.chainId ||
      wallet.chainId;
    const validChainIds = chainAliasByNetwork[starknetNetwork];

    const handleNetworkSwitch = async (wallet: any) => {
      setIsSwitching(true);
      try {
        await wallet.request({
          type: "wallet_switchStarknetChain",
          params: { chainId: chainAliasByNetwork[starknetNetwork][1] },
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const { wallet: refreshedWallet } = await starknetConnect();
        if (!refreshedWallet) {
          setSwitchError(true);
          setTimeout(() => setSwitchError(false), 5000);
          return;
        }
        const newChainId =
          refreshedWallet.account?.provider.chainId ||
          refreshedWallet.provider?.chainId ||
          refreshedWallet.chainId;
        setChainId(newChainId);
        const isValid = chainAliasByNetwork[starknetNetwork].some(
          (id) => id.toLowerCase() === newChainId?.toLowerCase()
        );
        if (isValid) {
          setAccount(refreshedWallet.account);
          setWrongNetwork(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else {
          setSwitchError(true);
          setTimeout(() => setSwitchError(false), 5000);
        }
      } catch (error: unknown) {
        setSwitchError(true);
        setTimeout(() => setSwitchError(false), 5000);
        WatchTowerLogger.error(
          "Network switch failed:",
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setIsSwitching(false);
      }
    };

    if (!validChainIds.includes(currentChainId)) {
      setWrongNetwork(true);
      if (isArgentWallet) await handleNetworkSwitch(wallet);
      return;
    }

    setAccount(wallet.account);
    setWrongNetwork(false);
  }, [starknetNetwork]);

  const connectToStellar = useCallback(async () => {
    try {
      const keypair = Keypair.random();
      setStellarAccount({
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      });
      setNoWallet(false);
      setWrongNetwork(false);
    } catch (error) {
      WatchTowerLogger.error("Stellar wallet connection failed:", {
        error: String(error),
      });
      setNoWallet(true);
    }
  }, []);

  const verifySignature = useCallback(
    async (signature: Signature) => {
      if (!account) return;
      setUnverifiedSignature("");
      setVerifyingSignature(true);
      try {
        await axios.post("/api/verify", {
          account: account?.address,
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
        setUnverifiedSignature(
          `${e.response?.data?.message}. ${e.response?.data?.error}`
        );
      }
    },
    [customLink, discordMemberId, discordServerId, account, starknetNetwork]
  );

  const sign = useCallback(async () => {
    if (!account) return;
    try {
      const messageCopy = {
        ...messageToSign,
        domain: { ...messageToSign.domain, chainId },
      };
      const signature = await account.signMessage(messageCopy);
      await verifySignature(signature);
    } catch (e: any) {
      WatchTowerLogger.error(e.message, e);
    }
  }, [account, verifySignature, chainId]);

  let walletDiv = (
    <div>
      {!account && !stellarAccount && (
        <div>
          <button
            className={styles.connect}
            onClick={isStellarNetwork ? connectToStellar : connectToStarknet}
            disabled={isSwitching}
          >
            {isSwitching
              ? "Switching Networks..."
              : `Connect ${isStellarNetwork ? "Stellar" : "Starknet"} Wallet`}
          </button>
          {wrongNetwork && (
            <div className="danger">
              {isArgent ? (
                isSwitching ? (
                  "Confirm network switch in your wallet..."
                ) : (
                  <>
                    {switchError && "Network switch failed. Please try again."}
                    {showSuccess &&
                      "Network switched successfully! Connecting..."}
                  </>
                )
              ) : (
                <div className="danger">
                  This Discord server has been configured to verify identity on
                  the {starknetNetwork} network.
                  <br />
                  Please switch your browser wallet to the {
                    starknetNetwork
                  }{" "}
                  network and connect again.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {(account || stellarAccount) &&
        !verifyingSignature &&
        !verifiedSignature && (
          <a className={styles.sign} onClick={sign}>
            Sign a message to verify your identity
          </a>
        )}
      {verifyingSignature && (
        <span className={styles.sign}>Verifying your signature...</span>
      )}
      {unverifiedSignature && (
        <div className="danger">
          {getSignatureErrorMessage(unverifiedSignature).short}
          <br />
          {getSignatureErrorMessage(unverifiedSignature).advanced && (
            <span className={styles.advancedErrorMessage}>
              Advanced: {getSignatureErrorMessage(unverifiedSignature).advanced}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (noWallet) {
    walletDiv = (
      <div>
        {isArgent ? (
          <div className="danger">
            Wallet detected but not connected. Please retry.
          </div>
        ) : (
          <div>
            No {isStellarNetwork ? "Stellar" : "Starknet"} wallet detected. Use
            a compatible wallet for the best experience.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.verify}>
      <Logo />
      <div>
        <div className={styles.serverInfo}>
          Discord server:
          <span className={styles.serverDisplay}>
            {discordServerIcon ? (
              <img
                src={discordServerIcon}
                alt="Discord Server Icon"
                className={styles.discordIcon}
              />
            ) : (
              <div className={styles.iconPlaceholder}>
                {discordServerName?.[0]?.toUpperCase()}
              </div>
            )}
            <b>{discordServerName}</b>
          </span>
        </div>
        <br />
        <span className={styles.networkDisplay}>
          Network:
          <Image
            src={
              isStellarNetwork
                ? "/assets/stellar-icon.png"
                : "/assets/starknet-icon.png"
            }
            height={25}
            width={25}
            alt="Network Icon"
          />
          <b>{starknetNetwork}</b>
        </span>
        <br />
        {(account || stellarAccount) && (
          <span className={styles.wallet}>
            {isStellarNetwork ? "Stellar" : "Starknet"} wallet:{" "}
            <b>{account?.address || stellarAccount?.publicKey}</b>{" "}
            <a
              onClick={() => {
                setAccount(undefined);
                setStellarAccount(null);
                const disconnectPromise = isStellarNetwork
                  ? Promise.resolve()
                  : starknetDisconnect();
                disconnectPromise.catch((error) =>
                  WatchTowerLogger.error("Disconnect failed:", error)
                );
              }}
            >
              Disconnect
            </a>
          </span>
        )}
        <br />
        {verifiedSignature && (
          <div>
            <span>
              Identity: <b>Verified</b>
            </span>
            <h1>YOU’RE ALL SET FREN</h1>
            <span>You shall close this tab</span>
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
  let discordServerIcon = null;
  const { discordServerId, discordMemberId, customLink } = query;
  const discordMember = await DiscordMemberRepository.findOne({
    where: { customLink, discordServerId, discordMemberId },
    relations: ["discordServer"],
  });
  if (!discordMember || discordMember.customLink !== customLink) {
    res.setHeader("location", "/");
    res.statusCode = 302;
    res.end();
    return { props: {} };
  }
  try {
    const serverInfo = await getDiscordServerInfo(`${query.discordServerId}`);
    discordServerName = serverInfo.name;
    discordServerIcon = serverInfo.icon
      ? `https://cdn.discordapp.com/icons/${query.discordServerId}/${
          serverInfo.icon
        }${serverInfo.icon.startsWith("a_") ? ".gif" : ".png"}`
      : null;
  } catch (e: any) {
    WatchTowerLogger.error(e.message, e);
  }
  return {
    props: {
      discordServerName,
      discordServerIcon,
      starknetNetwork: discordMember.starknetNetwork,
    },
  };
}

export default VerifyPage;
