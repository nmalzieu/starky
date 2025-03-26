import { log } from "../discord/logs";

import { ethers } from "ethers";

type SignatureVerify = {
  signatureValid: boolean;
  error?: string;
};

export async function verifySignature(
  account: string,
  message: string,
  signature: string,
  ethereumNetwork: "mainnet"
): Promise<SignatureVerify> {
  try {
    // Recover the signer address from the signed message
    const recoveredAddress = ethers.verifyMessage(message, signature);

    const signatureValid =
      recoveredAddress.toLowerCase() === account.toLowerCase();

    if (!signatureValid) {
      return { signatureValid, error: "Signer Address mismatch" };
    }

    return { signatureValid };
  } catch (e: any) {
    log(
      `Error while verifying signature for ${account} on ${ethereumNetwork}. Error code: ${e.errorCode}, message: ${e.message} `
    );
    return { signatureValid: false, error: e.message || e.errorCode };
  }
}
