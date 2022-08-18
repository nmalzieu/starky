import { Provider, Contract } from "starknet";
import { toBN } from "starknet/utils/number";

export const verifySignature = async (
  accountAddress: string,
  hexHash: string,
  signature: string[],
  mainnet: boolean
): Promise<boolean> => {
  // We can verify this message hash against the signature generated in the frontend
  // by calling the is_valid_signature method on the Account contract
  const provider = new Provider({
    network: mainnet ? "mainnet-alpha" : "goerli-alpha",
  });
  const hash = toBN(hexHash.replace("0x", ""), "hex").toString();
  try {
    const response = await provider.callContract({
      contractAddress: accountAddress,
      entrypoint: "is_valid_signature",
      calldata: [hash, `${signature.length}`, ...signature],
    });
    return response.result[0] === "0x1";
  } catch (e) {
    return false;
  }
};
