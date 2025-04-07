import { useCallback, useState } from "react";
import axios from "axios";
import WatchTowerLogger from "../watchTower";

const useSignatureVerification = (
  starknetNetwork: string,
  discordServerId: string,
  discordMemberId: string,
  customLink: string
) => {
  const [verifyingSignature, setVerifyingSignature] = useState<boolean>(false);
  const [verifiedSignature, setVerifiedSignature] = useState<boolean>(false);
  const [unverifiedSignature, setUnverifiedSignature] = useState<string>("");

  const verifySignature = useCallback(
    async (
      signature: string,
      account: string,
      message: string,
      network: number
    ) => {
      if (!account) return;
      setUnverifiedSignature("");
      setVerifyingSignature(true);
      try {
        await axios.post("/api/verify-eth", {
          account,
          signature,
          discordServerId,
          discordMemberId,
          customLink,
          network: starknetNetwork,
          message,
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
          `${e.response?.data?.message}.${e.response?.data?.error}` ||
            "Signature verification failed with data"
        );
      }
      setVerifyingSignature(false);
    },
    [starknetNetwork, discordServerId, discordMemberId, customLink]
  );

  return {
    verifyingSignature,
    verifiedSignature,
    unverifiedSignature,
    verifySignature,
  };
};

export default useSignatureVerification;
