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
  try {
    // First try with isValidSignature (Argent X style)
    const response = await callContract({
      starknetNetwork:
        starknetNetwork === "mainnet" ? "mainnet" : ("sepolia" as any),
      contractAddress: accountAddress,
      entrypoint: "isValidSignature",
      calldata: [hexHash, `${signature.length}`, ...signature],
    });

    if (response?.result?.[0] === "0x1") {
      return { signatureValid: true };
    }
  } catch (e: any) {
    // If isValidSignature fails, try is_valid_signature (Braavos style)
    try {
      const response = await callContract({
        starknetNetwork:
          starknetNetwork === "mainnet" ? "mainnet" : ("sepolia" as any),
        contractAddress: accountAddress,
        entrypoint: "is_valid_signature",
        calldata: [hexHash, `${signature.length}`, ...signature],
      });

      // Check if response and result exist
      if (!response || !response.result || response.result.length === 0) {
        return {
          signatureValid: false,
          error: "Invalid signature: received empty result",
        };
      }

      // Braavos returns 0x56414c4944 (VALID in hex) for valid signatures
      const signatureValid =
        response.result[0] === "0x1" ||
        response.result[0] === "0x56414c4944";

      return {
        signatureValid,
        error: signatureValid ? undefined : `Invalid signature: ${response.result[0]}`,
      };
    } catch (innerError: any) {
      log(
        `Error while verifying signature for ${accountAddress} on ${starknetNetwork}. Error code: ${innerError.errorCode}, message: ${innerError.message}`
      );

      return {
        signatureValid: false,
        error: `Signature verification failed: ${innerError.message || innerError.errorCode}`,
      };
    }
  }

  return {
    signatureValid: false,
    error: "Signature verification failed: Invalid signature format",
  };
};
