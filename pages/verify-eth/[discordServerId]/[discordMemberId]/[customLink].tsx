import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/router";
import { useWallet } from "../../../../utils/ethereum/context/WalletConnect";
import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerInfo } from "../../../../discord/utils";
import WatchTowerLogger from "../../../../watchTower";
import styles from "../../../../styles/Verify.module.scss";

type Props = {
  discordServerName: string;
  discordServerIcon?: string | null;
  ethereumNetwork: string;
};

const VERIFY_MESSAGE =
  "Sign this message to verify your Ethereum identity with Starky.";

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
  ethereumNetwork,
}: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const { connect, disconnect, account, networkType, balance, signMessage } =
    useWallet();
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [transactions, setTransactions] = useState<any[]>([]);

  const connectWallet = useCallback(async () => {
    try {
      setError("");
      await connect("Ethereum");
    } catch (err: any) {
      setError("Failed to connect wallet. Please try again.");
      WatchTowerLogger.error("Wallet connection error:", err);
    }
  }, [connect]);

  const verifySignature = useCallback(async () => {
    if (!account) return;
    setError("");
    setVerifying(true);

    try {
      const signature = await signMessage(VERIFY_MESSAGE);

      await axios.post("/api/verify-eth", {
        account,
        signature,
        discordServerId,
        discordMemberId,
        customLink,
      });

      setVerified(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message;
      const { short, advanced } = getSignatureErrorMessage(errorMessage);
      setError(short);
      WatchTowerLogger.error("Signature verification error:", advanced || err);
    } finally {
      setVerifying(false);
    }
  }, [account, signMessage, discordServerId, discordMemberId, customLink]);

  const fetchTransactions = async (address: string) => {
    try {
      const response = await axios.get(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`
      );
      return response.data.result;
    } catch (error) {
      console.error("Error fetching transactions", error);
      return [];
    }
  };

  useEffect(() => {
    if (account) {
      fetchTransactions(account).then(setTransactions);
    }
  }, [account]);

  let ethereumWalletDiv = (
    <div>
      {!account && (
        <div>
          <button
            className={styles.connect}
            onClick={connectWallet}
            disabled={verifying}
          >
            {verifying ? "Connecting..." : "Connect Ethereum Wallet"}
          </button>
        </div>
      )}
      {account && !verifying && !verified && (
        <a className={styles.sign} onClick={verifySignature}>
          Sign Message to Verify Identity
        </a>
      )}
      {verifying && (
        <span className={styles.sign}>Verifying your signature...</span>
      )}
      {error && (
        <div className="danger">
          {error}
          <br />
          {getSignatureErrorMessage(error).advanced && (
            <span className={styles.advancedErrorMessage}>
              Advanced: {getSignatureErrorMessage(error).advanced}
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
          Ethereum network:
          <Image
            src="/assets/ethereum-icon.png"
            height={25}
            width={25}
            alt="Ethereum Icon"
          />
          <b>{ethereumNetwork}</b>
        </span>
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
        {transactions.length > 0 ? (
          <div>
            <h3>Recent Transactions</h3>
            <ul>
              {transactions.slice(0, 5).map((tx) => (
                <li key={tx.hash}>
                  <a
                    href={`https://etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tx.hash.slice(0, 10)}... ({tx.value / 1e18} ETH)
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.advancedErrorMessage}>
            No recent transactions found.
          </p>
        )}

        <br />
        {verified ? (
          <div>
            <span>
              Identity: <b>verified</b>
            </span>
            <h1>YOU'RE ALL SET FREN</h1>
            <span>You can now close this tab</span>
          </div>
        ) : (
          ethereumWalletDiv
        )}
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
      ethereumNetwork: discordMember.ethereumNetwork || "Ethereum",
    },
  };
}

export default VerifyEthPage;
