import { useCallback, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Signature } from "starknet";
import { disconnectStarknetWallet } from "../../../../utils/wallets/starknet";

import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerInfo } from "../../../../discord/utils";
import { NetworkName } from "../../../../types/starknet";
import messageToSign from "../../../../utils/starknet/message";
import WatchTowerLogger from "../../../../watchTower";
import DiscordServerInfo from "../../../../components/verification/DiscordServerInfo";
import WalletInfo from "../../../../components/verification/WalletInfo";
import WalletConnectPopup from "../../../../components/WalletConnectPopup";

import styles from "../../../../styles/Verify.module.scss";
import networks from "../../../../configs/networks.json";

type Props = {
  discordServerName: string;
  discordServerIcon?: string | null;
  starknetNetwork: NetworkName;
  networkType: "starknet" | "stellar" | "ethereum";
};

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

  if (
    error.includes("Cannot read properties of undefined") ||
    error.includes("received empty result")
  ) {
    return {
      short:
        "your wallet signature verification failed, please try again or try using a different wallet",
      advanced:
        "The contract response was invalid. This may happen with some wallet implementations.",
    };
  }

  return {
    short: "your signature could not be verified, please try again",
    advanced: error,
  };
};

const VerifyPage = ({
  discordServerName,
  discordServerIcon,
  starknetNetwork,
  networkType,
}: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const [account, setAccount] = useState<any>(undefined);
  const [verifyingSignature, setVerifyingSignature] = useState<boolean>(false);
  const [verifiedSignature, setVerifiedSignature] = useState<boolean>(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState<string>("");
  const [chainId, setChainId] = useState<string>("");

  const handleConnect = useCallback(
    (connectedAccount: any, connectedChainId?: string, isArgent?: boolean) => {
      setAccount(connectedAccount);
      if (connectedChainId) setChainId(connectedChainId);
    },
    []
  );

  const handleDisconnect = useCallback(() => {
    setAccount(undefined);
    if (networkType === "starknet") {
      disconnectStarknetWallet().catch(WatchTowerLogger.error);
    }
    setChainId("");
    setVerifiedSignature(false);
    setUnverifiedSignature("");
  }, [networkType]);

  const verifySignature = useCallback(
    async (signature?: Signature) => {
      if (!account) return;
      setUnverifiedSignature("");
      setVerifyingSignature(true);
      try {
        await axios.post("/api/verify", {
          account: networkType === "starknet" ? account?.address : account,
          chain: networkType,
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
    [
      customLink,
      discordMemberId,
      discordServerId,
      account,
      starknetNetwork,
      networkType,
    ]
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

  const handleVerify = async () => {
    if (networkType === "starknet") {
      await sign();
    } else if (networkType === "stellar") {
      await verifySignature();
    }
  };

  return (
    <div className={styles.verify}>
      <div className={styles.header}>
        <Logo />
        <div className={styles.serverInfo}>
          <DiscordServerInfo
            discordServerName={discordServerName}
            discordServerIcon={discordServerIcon}
            network={starknetNetwork}
            networkType={networkType}
          />
        </div>
      </div>

      <div className={styles.content}>
        <WalletInfo
          account={account}
          networkType={networkType}
          onDisconnect={handleDisconnect}
        />

        {verifiedSignature && (
          <div className={styles.successMessage}>
            <span className={styles.identityStatus}>
              Identity: <b>verified</b>
            </span>
            <h1 className={styles.successTitle}>Verification Successful!</h1>
            <span className={styles.closeTabMessage}>
              You can now close this tab.
            </span>
          </div>
        )}

        {!verifiedSignature && (
          <div className={styles.actionContainer}>
            {!account && (
              <WalletConnectPopup
                networkType={networkType}
                network={starknetNetwork}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            )}
            {account && !verifyingSignature && !verifiedSignature && (
              <div className={styles.verifyButtonContainer}>
                {networkType === "starknet" ? (
                  <button
                    className={styles.verifyButton}
                    onClick={handleVerify}
                  >
                    Sign a message to verify your identity
                  </button>
                ) : (
                  <button
                    className={styles.verifyButton}
                    onClick={handleVerify}
                  >
                    Verify your{" "}
                    {networkType === "stellar" ? "Stellar" : "Ethereum"}{" "}
                    identity
                  </button>
                )}
              </div>
            )}
            {verifyingSignature && (
              <span className={styles.sign}>Verifying your identity...</span>
            )}
            {unverifiedSignature && (
              <div className={styles.errorMessage}>
                <span>
                  {getSignatureErrorMessage(unverifiedSignature).short}
                </span>{" "}
                <a
                  href="https://t.me/+Mi34Im1Uafc1Y2Q8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.errorLink}
                >
                  Report on Telegram
                </a>
                {getSignatureErrorMessage(unverifiedSignature).advanced && (
                  <span className={styles.advancedErrorMessage}></span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {process.env.NEXT_PUBLIC_STARKY_OFFICIAL && (
        <div className={styles.socialLinks}>
          <SocialLinks />
        </div>
      )}
    </div>
  );
};

export async function getServerSideProps({ res, query }: any) {
  await setupDb();
  let discordServerName = null;
  let discordServerIcon = null;
  const { discordServerId, discordMemberId, customLink } = query;
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

  const networkConfig = networks.find(
    (net: any) => net.name === discordMember.starknetNetwork
  );
  let networkType: "starknet" | "stellar" | "ethereum";
  if (!networkConfig) {
    res.setHeader("location", "/error?message=Unsupported%20network");
    res.statusCode = 302;
    res.end();
    return { props: {} };
  }

  if (["mainnet", "sepolia"].includes(networkConfig.name)) {
    networkType = "starknet";
  } else if (
    ["stellar-mainnet", "stellar-testnet"].includes(networkConfig.name)
  ) {
    networkType = "stellar";
  } else if (networkConfig.name === "ethereum-mainnet") {
    networkType = "ethereum";
  } else {
    res.setHeader("location", "/error?message=Unsupported%20network");
    res.statusCode = 302;
    res.end();
    return { props: {} };
  }

  return {
    props: {
      discordServerName,
      discordServerIcon,
      starknetNetwork: discordMember.starknetNetwork,
      networkType,
    },
  };
}

export default VerifyPage;
