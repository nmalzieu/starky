import { log } from "../discord/logs";

import { callContract } from "./call";

type SignatureVerify = {
  signatureValid: boolean;
  error?: string;
};

export const verifySignature = async (
  accountAddress: string,
  hexHash: string,
  signature: string[],
  starknetNetwork: string
): Promise<SignatureVerify> => {
  // We can verify this message hash against the signature generated in the frontend
  // by calling the is_valid_signature method on the Account contract
  try {
    const result = await callContract({
      starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "goerli",
      contractAddress: accountAddress,
      entrypoint: "isValidSignature",
      calldata: [hexHash, `${signature.length}`, ...signature],
    });

    const signatureValid = result[0] === "0x1";

    return {
      signatureValid,
      error: signatureValid ? undefined : `Invalid signature ${result[0]}`,
    };
  } catch (e: any) {
    try {
      const result = await callContract({
        starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "goerli",
        contractAddress: accountAddress,
        entrypoint: "is_valid_signature",
        calldata: [hexHash, `${signature.length}`, ...signature],
      });

      const signatureValid =
        result[0] === "0x1" ||
        result[0] === "0x0" ||
        result[0] === "0x56414c4944";

      return { signatureValid, error: signatureValid ? undefined : result[0] };
    } catch (e: any) {
      log(
        `Error while verifying signature for ${accountAddress} on ${starknetNetwork}. Error code: ${e.errorCode}, message: ${e.message} `
      );

      return { signatureValid: false, error: e.message || e.errorCode };
    }
  }
};
