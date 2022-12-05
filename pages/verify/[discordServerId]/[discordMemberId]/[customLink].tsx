import { useCallback, useState } from "react";
import {
  connect as starknetConnect,
  IStarknetWindowObject,
} from "@argent/get-starknet";
import axios from "axios";
import { useRouter } from "next/router";
import { Signature } from "starknet";

import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerName } from "../../../../discord/utils";
import messageToSign from "../../../../starknet/message";

import styles from "../../../../styles/Verify.module.scss";

type Props = {
  discordServerName: string;
  starknetNetwork: "goerli" | "mainnet";
};

const chainIdByNetwork = {
  goerli: "0x534e5f474f45524c49",
  mainnet: "0x534e5f4d41494e",
};

const VerifyPage = ({ discordServerName, starknetNetwork }: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const [starknet, setStarknet] = useState<IStarknetWindowObject | undefined>(
    undefined
  );
  const [noStarknetWallet, setNotStarknetWallet] = useState(false);
  const [wrongStarknetNetwork, setWrongStarknetNetwork] = useState(false);
  const [verifyingSignature, setVerifyingSignature] = useState(false);
  const [verifiedSignature, setVerifiedSignature] = useState(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState(false);

  const connectToStarknet = useCallback(async () => {
    const strk = await starknetConnect();
    if (!strk) {
      setNotStarknetWallet(true);
      return;
    }
    await strk.enable();
    const chainId = strk.provider.chainId;
    if (chainId !== chainIdByNetwork[starknetNetwork]) {
      setWrongStarknetNetwork(true);
    } else {
      setStarknet(strk);
    }
  }, [starknetNetwork]);

  const verifySignature = useCallback(
    async (signature: Signature) => {
      setUnverifiedSignature(false);
      setVerifyingSignature(true);
      try {
        await axios.post("/api/verify", {
          account: starknet?.account?.address,
          signature,
          discordServerId,
          discordMemberId,
          customLink,
          network: starknetNetwork,
        });
        setVerifiedSignature(true);
        setVerifyingSignature(false);
      } catch (e) {
        console.error(e);
        setVerifyingSignature(false);
        setUnverifiedSignature(true);
      }
    },
    [
      customLink,
      discordMemberId,
      discordServerId,
      starknet?.account?.address,
      starknetNetwork,
    ]
  );

  const sign = useCallback(async () => {
    if (!starknet?.isConnected) return;

    try {
      const signature = await starknet.account.signMessage(messageToSign);
      await verifySignature(signature);
    } catch (e) {
      console.log(e);
    }
  }, [starknet?.account, starknet?.isConnected, verifySignature]);

  let starknetWalletDiv = (
    <div>
      {!starknet?.isConnected && (
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
      {starknet?.isConnected && !verifyingSignature && !verifiedSignature && (
        <a className={styles.sign} onClick={sign}>
          sign a message to verify your identity
        </a>
      )}
      {verifyingSignature && (
        <span className={styles.sign}>verifying your signature...</span>
      )}
      {unverifiedSignature && (
        <div className="danger">
          your signature could not be verified, please try again
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
        {starknet?.isConnected && (
          <span className={styles.starknetWallet}>
            Starknet wallet: <b>{starknet.account.address}</b>{" "}
            <a onClick={() => setStarknet(undefined)}>disconnect</a>
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
