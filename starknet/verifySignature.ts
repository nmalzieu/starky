import { toBN } from "starknet/utils/number";
import { callContract } from "./call";

export const verifySignature = async (
  accountAddress: string,
  hexHash: string,
  signature: string[],
  starknetNetwork: string
): Promise<boolean> => {
  // We can verify this message hash against the signature generated in the frontend
  // by calling the is_valid_signature method on the Account contract
  try {
    const result = await callContract({
      starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "goerli",
      contractAddress: accountAddress,
      entrypoint: "is_valid_signature",
      calldata: [hexHash, `${signature.length}`, ...signature],
    });

    return result[0] === "0x1";
  } catch (e) {
    console.error(e);
    return false;
  }
};
