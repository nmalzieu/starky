import { ethers } from "ethers";
import { log } from "../discord/logs";

type SignatureVerify = {
  signatureValid: boolean;
  error?: string;
};

export const verifySignature = async (
  signerAddress: string,
  message: string,
  signature: string,
  chainId: number
): Promise<SignatureVerify> => {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    const signatureValid =
      recoveredAddress.toLowerCase() === signerAddress.toLowerCase();

    return {
      signatureValid,
      error: signatureValid
        ? undefined
        : "Recovered address does not match signer",
    };
  } catch (e: any) {
    log(`Error verifying Ethereum signature: ${e.message}`);
    return { signatureValid: false, error: e.message };
  }
};
