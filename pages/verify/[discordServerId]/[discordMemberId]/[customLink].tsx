import { useCallback, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Signature } from "starknet";
import { connect as starknetConnect, disconnect } from "starknetkit";

import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import chainAliasByNetwork from "../../../../configs/chainAliasByNetwork.json";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerName } from "../../../../discord/utils";
import { NetworkName } from "../../../../types/starknet";
import messageToSign from "../../../../utils/starknet/message";

import styles from "../../../../styles/Verify.module.scss";

type Props = {
  discordServerName: string;
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
  return {
    short: "your signature could not be verified, please try again",
    advanced: error,
  };
};

const VerifyPage = ({ discordServerName, starknetNetwork }: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const [account, setAccount] = useState<any>(undefined);
  const [noStarknetWallet, setNotStarknetWallet] = useState(false);
  const [wrongStarknetNetwork, setWrongStarknetNetwork] = useState(false);
  const [verifyingSignature, setVerifyingSignature] = useState(false);
  const [verifiedSignature, setVerifiedSignature] = useState(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState("");

  const connectToStarknet = useCallback(async () => {
    const { wallet } = await starknetConnect();
    if (!wallet) {
      setNotStarknetWallet(true);
      return;
    }
    console.log("Wallet information", wallet);
    const chain =
      wallet.account.provider.chainId ||
      wallet.provider.chainId ||
      wallet.chainId;
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
        console.error(
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
      const signature = await account.signMessage(messageToSign);
      await verifySignature(signature);
    } catch (e) {
      console.log(e);
    }
  }, [account, verifySignature]);

  let starknetWalletDiv = (
    <div>
      {!account && (
        <div>
          <a className={styles.connect} onClick={connectToStarknet}>
            connect your Starknet wallet
          </a>
          {wrongStarknetNetwork && (
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

  if (noStarknetWallet) {
    starknetWalletDiv = <div>no Starknet wallet detected on your browser.</div>;
  }

  return (
    <div className={styles.verify}>
      <Logo />
      <div>
        Discord server: <b>{discordServerName}</b>
        <br />
        Starknet network: <b>{starknetNetwork}</b>
        <br />
        {account && (
          <span className={styles.starknetWallet}>
            Starknet wallet: <b>{account.address}</b>{" "}
            <a
              onClick={() => {
                setAccount(undefined);
                disconnect().catch(console.error);
              }}
            >
              disconnect
            </a>
          </span>
        )}
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
    discordServerName = await getDiscordServerName(`${query.discordServerId}`);
  } catch (e) {
    console.error(e);
  }
  return {
    props: {
      discordServerName,
      starknetNetwork: discordMember.starknetNetwork,
    },
  };
}

export default VerifyPage;
