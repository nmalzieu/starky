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
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerName } from "../../../../discord/utils";
import { NetworkName } from "../../../../types/starknet";
import messageToSign from "../../../../utils/starknet/message";
import WatchTowerLogger from "../../../../watchTower";

import styles from "../../../../styles/Verify.module.scss";

type Props = {
  discordServerName: string;
  starknetNetwork: NetworkName;
  signMessage: (message: any) => Promise<Signature>;
};

type StarknetAccount = {
  address: string;
  network: string;
};

type StellarAccount = {
  publicKey: string;
  network: string;
};

type ChainIds = {
  mainnet: string;
  sepolia: string;
};

const chainIds: ChainIds = {
  mainnet: "SN_MAIN",
  sepolia: "SN_SEPOLIA",
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
  const [account, setAccount] = useState<
    StarknetAccount | StellarAccount | undefined
  >(undefined);
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
    const fetchNetworkConfig = async () => {
      const response = await fetch("/configs/networks.json");
      const networks = await response.json();
      const networkConfig = networks.find(
        (net: any) => net.name === starknetNetwork
      );
      if (networkConfig) {
        setCurrentChain(networkConfig.chain);
      }
    };
    fetchNetworkConfig();
  }, [starknetNetwork]);

  const connectToStarknet = useCallback(async () => {
    const { wallet } = await starknetConnect();
    if (!wallet) {
      setNoWallet(true);
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
      setWrongNetwork(true);
    else setAccount({ address: wallet.account.address, network: chain });
  }, [starknetNetwork]);

  const connectToStellar = useCallback(async () => {
    try {
      const publicKey = await getAddress();

      const network = await getNetwork();

      const netWorkToString = network.toString();

      const publicKeyToString = publicKey.toString();

      setAccount({ publicKey: publicKeyToString, network: netWorkToString });
    } catch (error) {
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
        const message = "Your message to sign"; // Define your message here
        signature = await stellarSignMessage(message, {
          address: account.publicKey,
        });
      } else {
        const messageCopy = {
          ...messageToSign,
          domain: { ...messageToSign.domain, chainId },
        };
        signature = messageCopy;
      }
    } catch (e: any) {
      WatchTowerLogger.error(e.message, e);
    }
  }, [account, verifySignature, chainId]);

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
            connect your {currentChain} wallet
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
            {currentChain} wallet:{" "}
            <b>
              {"publicKey" in account ? account.publicKey : account.address}
            </b>{" "}
            <a
              onClick={() => {
                setAccount(undefined);
                disconnect().catch(WatchTowerLogger.error);
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
        {!verifiedSignature && walletDiv}
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
    discordServerName = await getDiscordServerName(
      `Server ID: ${query.discordServerId}`
    );
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
