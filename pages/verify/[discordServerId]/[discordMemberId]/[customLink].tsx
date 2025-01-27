import { useCallback, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Signature } from "starknet";
import { connect as starknetConnect, disconnect as starknetDisconnect } from "starknetkit";
// Import Stellar SDK (you'll need to add this dependency)
import StellarSdk from "stellar-sdk";
import Logo from "../../../../components/Logo";
import SocialLinks from "../../../../components/SocialLinks";
import chainAliasByNetwork from "../../../../configs/chainAliasByNetwork.json";
import networks from "../../../../configs/networks.json";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { getDiscordServerName } from "../../../../discord/utils";
import { NetworkName } from "../../../../types/starknet";
import messageToSign from "../../../../utils/starknet/message";
import WatchTowerLogger from "../../../../watchTower";

import styles from "../../../../styles/Verify.module.scss";

type NetworkConfig = {
  name: string;
  url: string;
  chain: "starknet" | "stellar";
};

async function stellarConnect() {
  console.log("Connecting to Stellar wallet...");
  const wallet = { address: "stellar-wallet-address" }; // Mock example
  return wallet;
}

async function stellarDisconnect() {
  console.log("Disconnecting from Stellar wallet...");
}

type Props = {
  discordServerName: string;
  networkConfig: NetworkConfig;
};

type WalletConnection = {
  connect: () => Promise<any>;
  disconnect: () => Promise<void>;
  signMessage: (message: any) => Promise<any>;
};

const getSignatureErrorMessage = (
  error: string,
  chain: string
): {
  short: string;
  advanced?: string;
} => {
  if (chain === "starknet") {
    if (error.includes("Contract not found") || error.includes("UNINITIALIZED"))
      return {
        short:
          "your wallet is not yet initialized, please make a transaction (sending ETH to yourself works) to initialize it",
        advanced: error,
      };
  } else if (chain === "stellar") {
    if (error.includes("account_not_found"))
      return {
        short:
          "your Stellar account is not yet initialized, please fund it with the minimum balance",
        advanced: error,
      };
  }
  
  return {
    short: "your signature could not be verified, please try again",
    advanced: error,
  };
};

const walletConnectors: Record<string, WalletConnection> = {
  starknet: {
    connect: async () => {
      const { wallet } = await starknetConnect();
      return wallet;
    },
    disconnect: starknetDisconnect,
    signMessage: async (account: any) => {
      return account.signMessage(messageToSign);
    },
  },
  stellar: {
    connect: async () => {
      const wallet = await stellarConnect();
      return wallet;
    },
    disconnect: stellarDisconnect,
    signMessage: async (account: any) => {
      // Here I'm Implementing Stellar message 
      return account.signMessage(messageToSign);
    },
  },
};

const VerifyPage = ({ discordServerName, networkConfig }: Props) => {
  const router = useRouter();
  const { discordServerId, discordMemberId, customLink } = router.query;
  const [account, setAccount] = useState<any>(undefined);
  const [noWallet, setNoWallet] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [verifyingSignature, setVerifyingSignature] = useState(false);
  const [verifiedSignature, setVerifiedSignature] = useState(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState("");
  const [chainId, setChainId] = useState("");

  const connectWallet = useCallback(async () => {
    const walletConnector = walletConnectors[networkConfig.chain];
    if (!walletConnector) {
      WatchTowerLogger.error("Unsupported chain");
      return;
    }

    try {
      const wallet = await walletConnector.connect();
      if (!wallet) {
        setNoWallet(true);
        return;
      }

      WatchTowerLogger.info("Wallet information", wallet);
      
      // Handle chain ID verification based on the chain type
      const chain = networkConfig.chain === "starknet"
        ? wallet.account.provider.chainId || wallet.provider.chainId || wallet.chainId
        : wallet.network; // For Stellar

      setChainId(chain);

      // Verify network matches configuration
      const isCorrectNetwork = networkConfig.chain === "starknet"
        ? verifyStarknetNetwork(chain, networkConfig.name)
        : verifyStellarNetwork(chain, networkConfig.name);

      if (!isCorrectNetwork) {
        setWrongNetwork(true);
        return;
      }

      setAccount(wallet.account || wallet);
    } catch (error) {
      WatchTowerLogger.error("Wallet connection failed");
      setNoWallet(true);
    }
  }, [networkConfig]);

  const verifySignature = useCallback(
    async (signature: any) => {
      if (!account) return;
      setUnverifiedSignature("");
      setVerifyingSignature(true);
      try {
        await axios.post("/api/verify", {
          account: account?.address || account?.publicKey,
          signature,
          discordServerId,
          discordMemberId,
          customLink,
          network: networkConfig.name,
          chain: networkConfig.chain,
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
    [account, customLink, discordMemberId, discordServerId, networkConfig]
  );

  const sign = useCallback(async () => {
    if (!account) return;
    try {
      const walletConnector = walletConnectors[networkConfig.chain];
      const signature = await walletConnector.signMessage(account);
      await verifySignature(signature);
    } catch (e: any) {
      WatchTowerLogger.error(e.message, e);
    }
  }, [account, verifySignature, networkConfig.chain]);

  const disconnect = useCallback(async () => {
    try {
      const walletConnector = walletConnectors[networkConfig.chain];
      await walletConnector.disconnect();
      setAccount(undefined);
    } catch (error) {
      WatchTowerLogger.error("Disconnect failed");
    }
  }, [networkConfig.chain]);

  let walletDiv = (
    <div>
      {!account && (
        <div>
          <a className={styles.connect} onClick={connectWallet}>
            connect your {networkConfig.chain} wallet
          </a>
          {wrongNetwork && (
            <div className="danger">
              this discord server has been configured to verify identity on the{" "}
              {networkConfig.name} network.
              <br />
              please switch your wallet to the {networkConfig.name} network
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
          {getSignatureErrorMessage(unverifiedSignature, networkConfig.chain).short}
          <br />
          {getSignatureErrorMessage(unverifiedSignature, networkConfig.chain).advanced && (
            <span className={styles.advancedErrorMessage}>
              advanced: {getSignatureErrorMessage(unverifiedSignature, networkConfig.chain).advanced}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (noWallet) {
    walletDiv = <div>no {networkConfig.chain} wallet detected on your browser.</div>;
  }

  return (
    <div className={styles.verify}>
      <Logo />
      <div>
        Discord server: <b>{discordServerName}</b>
        <br />
        Network: <b>{networkConfig.name}</b> ({networkConfig.chain})
        <br />
        {account && (
          <span className={styles.wallet}>
            {networkConfig.chain} wallet: <b>{account.address || account.publicKey}</b>{" "}
            <a onClick={disconnect}>
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
            <h1>YOU'RE ALL SET FREN</h1>
            <span>you shall close this tab</span>
          </div>
        )}
        {!verifiedSignature && walletDiv}
      </div>
      {process.env.NEXT_PUBLIC_STARKY_OFFICIAL && <SocialLinks />}
    </div>
  );
};

const verifyStarknetNetwork = (chain: string, networkName: string): boolean => {
  const networkIndex = Object.values(chainAliasByNetwork).findIndex((aliases) =>
    aliases.includes(chain)
  );
  return networkName === Object.keys(chainAliasByNetwork)[networkIndex];
};

const verifyStellarNetwork = (chain: string, networkName: string): boolean => {
  if (networkName === "stellar-mainnet") {
    return chain === "public";
  } else if (networkName === "stellar-testnet") {
    return chain === "testnet";
  }
  return false;
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

  // Find network configuration
  const networkConfig = networks.find(
    (network) => network.name === discordMember.starknetNetwork
  );

  if (!networkConfig) {
    throw new Error(`Network configuration not found for ${discordMember.starknetNetwork}`);
  }

  try {
    discordServerName = await getDiscordServerName(`${query.discordServerId}`);
  } catch (e: any) {
    WatchTowerLogger.error(e.message, e);
  }

  return {
    props: {
      discordServerName,
      networkConfig,
    },
  };
}

export default VerifyPage;
