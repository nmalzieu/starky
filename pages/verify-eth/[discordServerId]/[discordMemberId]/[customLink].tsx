import { useCallback } from "react";
import { useRouter } from "next/router";
import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerInfo } from "../../../../discord/utils";
import WatchTowerLogger from "../../../../watchTower";
import styles from "../../../../styles/Verify.module.scss";
import { NetworkName } from "../../../../types/starknet";
import messageToSign from "../../../../utils/starknet/message";
import DiscordServerInfo from "../../../../components/verification/DiscordServerInfo";
import TransactionList from "../../../../components/verification/TransactionList";
import useWalletConnection from "../../../../hooks/useWalletConnection";
import useSignatureVerification from "../../../../hooks/useSignatureVerification";

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
        "Your wallet is not yet initialized, please make a transaction (sending ETH to yourself works) to initialize it",
      advanced: error,
    };
  return {
    short: "Your signature could not be verified, please try again",
    advanced: error,
  };
};

const VerifyEthPage = ({
  discordServerName,
  discordServerIcon,
  starknetNetwork,
}: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const {
    account,
    connectWallet,
    disconnect,
    networkType,
    balance,
    signMessage,
  } = useWalletConnection();

  const {
    verifyingSignature,
    verifiedSignature,
    unverifiedSignature,
    verifySignature,
  } = useSignatureVerification(
    starknetNetwork,
    discordServerId as string,
    discordMemberId as string,
    customLink as string
  );

  const sign = useCallback(async () => {
    if (!account) return;
    try {
      const messageCopy = {
        ...messageToSign,
        domain: {
          ...messageToSign.domain,
          chainId: "1",
        },
      };

      const signature = await signMessage(JSON.stringify(messageCopy.message));

      // Verify the signature
      await verifySignature(
        signature,
        account,
        JSON.stringify(messageCopy.message),
        parseInt(networkType || "1")
      );
    } catch (e: any) {
      WatchTowerLogger.error(e.message, e);
    }
  }, [account, signMessage, verifySignature, networkType]);

  let ethereumWalletDiv = (
    <div>
      {!account && (
        <div>
          <button
            className={styles.connect}
            onClick={connectWallet}
            disabled={verifyingSignature}
          >
            {verifyingSignature ? "Connecting..." : "Connect Ethereum Wallet"}
          </button>
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

  return (
    <div className={styles.verify}>
      <Logo />
      <div>
        <DiscordServerInfo
          discordServerName={discordServerName}
          discordServerIcon={discordServerIcon}
          starknetNetwork={starknetNetwork}
        />
        <br />
        {account && (
          <span className={styles.starknetWallet}>
            Ethereum wallet: <b>{account}</b>{" "}
            <a
              onClick={() => {
                disconnect();
              }}
            >
              disconnect
            </a>
            <br />
            Balance: <b>{balance ? `${balance} ETH` : "Loading..."}</b>
          </span>
        )}
        <br />
        <TransactionList account={account} />

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
        {!verifiedSignature && ethereumWalletDiv}
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

export default VerifyEthPage;
