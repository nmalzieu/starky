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
    log(
      `First attempt (isValidSignature) failed for ${accountAddress} on ${starknetNetwork}. Error: ${e.message}`
    );

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
        log(
          `Empty result from is_valid_signature for ${accountAddress} on ${starknetNetwork}`
        );
        return {
          signatureValid: false,
          error: "Invalid signature: received empty result",
        };
      }

      // Log the actual response for debugging
      log(
        `Signature verification response for ${accountAddress} on ${starknetNetwork}: ${JSON.stringify(
          response.result
        )}`
      );

      // Handle different success codes
      const signatureValid =
        response.result[0] === "0x1" ||
        response.result[0] === "0x56414c4944" || // VALID in hex
        response.result[0] === "0x0"; // Some implementations return 0x0 for success

      if (!signatureValid) {
        log(
          `Invalid signature response for ${accountAddress} on ${starknetNetwork}: ${response.result[0]}`
        );
      }

      return {
        signatureValid,
        error: signatureValid
          ? undefined
          : `Invalid signature: ${response.result[0]}`,
      };
    } catch (innerError: any) {
      // Check for specific error codes
      const errorMessage = innerError.message || innerError.errorCode;
      const revertError = innerError.revert_error;
      
      log(
        `Error while verifying signature for ${accountAddress} on ${starknetNetwork}. Error code: ${innerError.errorCode}, message: ${errorMessage}, revert_error: ${revertError}`
      );

      // Handle specific error cases
      if (revertError === "0x494e56414c49445f534947") {
        return {
          signatureValid: false,
          error: "Invalid signature format for this network",
        };
      }

      return {
        signatureValid: false,
        error: `Signature verification failed: ${errorMessage}`,
      };
    }
  }

  return {
    signatureValid: false,
    error: "Signature verification failed: Invalid signature format",
  };
};
