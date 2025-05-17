import { ethers } from "ethers";
import { verifyMessageHash } from "starknet";
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
    if (typeof chainId === "string" && chainId.startsWith("0x")) {
      // This is a Starknet chainId (e.g., 0x534e5f474f45524c49)
      const parsedSig = JSON.parse(signature);

      const valid = await verifyMessageHash({
        message: {
          domain: {
            name: "Braavos",
            version: "1",
            chainId: chainId.toString(),
          },
          types: {
            StarknetDomain: [
              { name: "name", type: "felt" },
              { name: "chainId", type: "felt" },
              { name: "version", type: "felt" },
            ],
            Message: [
              { name: "content", type: "felt" },
            ],
          },
          primaryType: "Message",
          message: {
            content: message,
          },
        },
        signature: parsedSig,
        expectedAddress: signerAddress,
      });

      return {
        signatureValid: valid,
        error: valid ? undefined : "Invalid Starknet signature",
      };
    } else {
      // Ethereum case
      const recoveredAddress = ethers.verifyMessage(message, signature);

      const signatureValid =
        recoveredAddress.toLowerCase() === signerAddress.toLowerCase();

      return {
        signatureValid,
        error: signatureValid
          ? undefined
          : "Recovered address does not match signer",
      };
    }
  } catch (e: any) {
    log(`Error verifying Ethereum signature: ${e.message}`);
    return { signatureValid: false, error: e.message };
  }
};
