import { callContract } from "../starknet/call";

import { StarkyModuleConfig, StarkyModuleField } from "./types";

export const name = "Wallet detector (Argent only)";
export const refreshInCron = true;
export const refreshOnTransfer = false;

// TODO => add field to ask for Argent or Braavos
// we need to be able to validate config first
export const fields: StarkyModuleField[] = [];

export const shouldHaveRole = async (
  starknetWalletAddress: string,
  starknetNetwork: "mainnet" | "goerli",
  starkyModuleConfig: StarkyModuleConfig
): Promise<boolean> => {
  // TODO => use starkyModuleConfig to support not only argent but also Braavos
  try {
    const interface1 = await callContract({
      starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "goerli",
      contractAddress: starknetWalletAddress,
      entrypoint: "supportsInterface",
      calldata: ["0x3943f10f"],
    });
    const interface2 = await callContract({
      starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "goerli",
      contractAddress: starknetWalletAddress,
      entrypoint: "supportsInterface",
      calldata: ["0xf10dbd44"],
    });

    const isWallet = interface1[0] === "0x1" || interface2[0] === "0x1";

    if (!isWallet) return false;

    try {
      const name = await callContract({
        starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "goerli",
        contractAddress: starknetWalletAddress,
        entrypoint: "getName",
        calldata: [],
      });

      const isArgent = name[0] === "0x417267656e744163636f756e74";
      if (isArgent) return true;
    } catch (e: any) {
      if (
        e?.errorCode === "StarknetErrorCode.ENTRY_POINT_NOT_FOUND_IN_CONTRACT"
      ) {
        // Braavos does not have the getName() method
      } else {
        throw e;
      }
    }
    return false;
  } catch (e: any) {
    console.log(e);
    return false;
  }
};
