import axios from "axios";
import {
  connect as starknetConnect,
  IStarknetWindowObject,
} from "@argent/get-starknet";
import { getDiscordServerName } from "../../../../discord/utils";
import { useCallback, useState } from "react";
import { Signature } from "starknet";
import messageToSign from "../../../../starknet/message";
import { useRouter } from "next/router";
import { DiscordMemberRepository, setupDb } from "../../../../db";
import { AppDataSource } from "../../../../db/data-source";

type Props = {
  discordServerName: string;
  starknetNetwork: "goerli" | "mainnet";
};

const chainIdByNetwork = {
  goerli: "SN_GOERLI",
  mainnet: "SN_MAIN",
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
    const chainId = (strk as any).chainId;
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
        });
        setVerifiedSignature(true);
        setVerifyingSignature(false);
      } catch (e) {
        setVerifyingSignature(false);
        setUnverifiedSignature(true);
      }
    },
    [customLink, discordMemberId, discordServerId, starknet?.account?.address]
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

  if (verifiedSignature) {
    return <div>Successfully verified! You can close this window.</div>;
  }

  const headerDiv = (
    <div>
      Welcome to Starkcord!
      <br />
      Discord server: {discordServerName}
      <br />
      Starknet network: {starknetNetwork}
      <br />
    </div>
  );

  let starknetWalletDiv = (
    <div>
      Starknet wallet:{" "}
      {!starknet?.isConnected && (
        <span>
          {wrongStarknetNetwork && (
            <span>
              This Discord server has been configured to verify identity on the{" "}
              {starknetNetwork} network.
              <br />
              Please switch your browser wallet to the {starknetNetwork} network
              then click again on{" "}
            </span>
          )}
          <button onClick={connectToStarknet}>Connect to Starknet</button>
        </span>
      )}
      {starknet?.isConnected && (
        <span>
          {starknet.account.address}{" "}
          <button onClick={() => setStarknet(undefined)}>Disconnect</button>
        </span>
      )}
      {starknet?.isConnected && !verifyingSignature && (
        <div>
          <button onClick={sign}>Sign a message to verify your identity</button>
        </div>
      )}
      {verifyingSignature && <div>Verifying your signature...</div>}
      {unverifiedSignature && <div>Your signature could not be verified</div>}
    </div>
  );

  if (noStarknetWallet) {
    starknetWalletDiv = <div>No Starknet wallet detected on your browser.</div>;
  }

  return (
    <div>
      Welcome to Starkcord!
      <br />
      Discord server: {discordServerName}
      <br />
      Starknet network: {starknetNetwork}
      <br />
      {starknetWalletDiv}
    </div>
  );
};

export async function getServerSideProps({ res, query }: any) {
  await setupDb();
  let discordServerName = null;
  const { discordServerId, discordMemberId, customLink } = query;
  const discordMember = await DiscordMemberRepository.findOne({
    where: { discordServerId, id: discordMemberId },
    relations: ["discordServer"],
  });
  if (!discordMember || discordMember.customLink !== customLink) {
    res.setHeader("location", "/");
    res.statusCode = 302;
    res.end();
    return;
  }
  try {
    discordServerName = await getDiscordServerName(`${query.discordServerId}`);
  } catch (e) {}
  return {
    props: {
      discordServerName,
      starknetNetwork: discordMember.discordServer.starknetNetwork,
    },
  };
}

export default VerifyPage;
