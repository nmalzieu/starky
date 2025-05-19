import { useCallback, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Signature } from "starknet";
import { connect as starknetConnect, disconnect } from "starknetkit";

import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import chainAliasByNetwork from "../../../../configs/chainAliasByNetwork.json";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerInfo } from "../../../../discord/utils";
import { NetworkName } from "../../../../types/starknet";
import messageToSign from "../../../../utils/starknet/message";
import WatchTowerLogger from "../../../../watchTower";
import DiscordServerInfo from "../../../../components/verification/DiscordServerInfo";
import WalletInfo from "../../../../components/verification/WalletInfo";

import styles from "../../../../styles/Verify.module.scss";

type Props = {
  discordServerName: string;
  discordServerIcon?: string | null;
  starknetNetwork: NetworkName;
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

  // Handle the specific undefined property error
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
}: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const [account, setAccount] = useState<any>(undefined);
  const [noStarknetWallet, setNotStarknetWallet] = useState<boolean>(false);
  const [wrongStarknetNetwork, setWrongStarknetNetwork] =
    useState<boolean>(false);
  const [verifyingSignature, setVerifyingSignature] = useState<boolean>(false);
  const [verifiedSignature, setVerifiedSignature] = useState<boolean>(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState<string>("");
  const [chainId, setChainId] = useState<string>("");
  const [isArgent, setIsArgent] = useState<boolean>(false);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [switchError, setSwitchError] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const connectToStarknet = useCallback(async () => {
    const { wallet } = await starknetConnect();
    if (!wallet) {
      setNotStarknetWallet(true);
      return;
    }
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
      setWrongStarknetNetwork(true);
    else setAccount(wallet.account);

    const isArgentWallet = wallet.id.toLowerCase().includes("argent");
    setIsArgent(isArgentWallet);

    const currentChainId =
      wallet.account?.provider.chainId ||
      wallet.provider?.chainId ||
      wallet.chainId;
    const validChainIds = chainAliasByNetwork[starknetNetwork];

    const getTargetChainId = () => {
      return chainAliasByNetwork[starknetNetwork][1];
    };

    const handleNetworkSwitch = async (wallet: any) => {
      setIsSwitching(true);
      try {
        await wallet.request({
          type: "wallet_switchStarknetChain",
          params: { chainId: getTargetChainId() },
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
          setWrongStarknetNetwork(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else {
          setSwitchError(true);
          setTimeout(() => setSwitchError(false), 5000);
        }
      } catch (error: any) {
        setSwitchError(true);
        setTimeout(() => setSwitchError(false), 5000);
        WatchTowerLogger.error("Network switch failed:", error);
      } finally {
        setIsSwitching(false);
      }
    };

    if (!validChainIds.includes(currentChainId)) {
      setWrongStarknetNetwork(true);

      if (isArgentWallet) {
        await handleNetworkSwitch(wallet);
        return;
      }

      return;
    }

    setAccount(wallet.account);
    setWrongStarknetNetwork(false);
  }, [starknetNetwork]);

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

  let starknetWalletDiv = (
    <div>
      {!account && (
        <div>
          <button
            className={styles.connect}
            onClick={connectToStarknet}
            disabled={isSwitching}
          >
            {isSwitching ? "Switching Networks..." : "Connect Starknet Wallet"}
          </button>

          {wrongStarknetNetwork && (
            <div className="danger">
              {isArgent ? (
                isSwitching ? (
                  "Confirm network switch in your Argent wallet..."
                ) : (
                  <>
                    {switchError && "Network switch failed. Please try again."}
                    {showSuccess &&
                      "Network switched successfully! Connecting..."}
                  </>
                )
              ) : (
                <div className="danger">
                  this discord server has been configured to verify identity on
                  the {starknetNetwork} network.
                  <br />
                  please switch your browser wallet to the {
                    starknetNetwork
                  }{" "}
                  network then connect again
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {account && !verifyingSignature && !verifiedSignature && (
        <>
          <br></br>
          <button className={styles.verify} onClick={sign}>
            Sign a message to verify your identity
          </button>
        </>
      )}
      {verifyingSignature && (
        <span className={styles.sign}>verifying your signature...</span>
      )}
      {unverifiedSignature && (
        <div className="danger">
          {getSignatureErrorMessage(unverifiedSignature).short}{" "}
          <a
            href="https://t.me/+Mi34Im1Uafc1Y2Q8"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.errorLink}
          >
            Report on Telegram
          </a>
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

  if (noStarknetWallet) {
    starknetWalletDiv = (
      <div>
        {isArgent ? (
          <div className="danger">
            Argent wallet detected but not connected. Please retry.
          </div>
        ) : (
          <div>
            No Starknet wallet detected. We recommend using Argent Wallet for
            best experience.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.verify}>
      <Logo />
      <div>
        <DiscordServerInfo
          discordServerName={discordServerName}
          discordServerIcon={discordServerIcon}
          network={starknetNetwork}
          networkType="starknet"
        />
        <br />

        <WalletInfo
          account={account}
          networkType="starknet"
          verifiedSignature={verifiedSignature}
          onDisconnect={() => {
            setAccount(undefined);
            disconnect().catch(WatchTowerLogger.error);
          }}
        />

        <br />
        {verifiedSignature && (
          <div>
            <span>
              Identity: <b>verified</b>
            </span>
            <h1>YOU’RE ALL SET FREN</h1>
            <span>you shall close this tab</span>
          </div>
        )}
        {!verifiedSignature && starknetWalletDiv}
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
  return {
    props: {
      discordServerName,
      discordServerIcon,
      starknetNetwork: discordMember.starknetNetwork,
    },
  };
}

export default VerifyPage;
