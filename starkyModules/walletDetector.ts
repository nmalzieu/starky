import { NetworkName } from "../types/networks";
import { StarkyModuleConfig, StarkyModuleField } from "../types/starkyModules";
import { execWithRateLimit } from "../utils/execWithRateLimit";
import { callContract } from "../utils/starknet/call";
import WatchTowerLogger from "../watchTower";

export const name = "Wallet detector (Argent only)";
// Only refreshing when connecting the wallet or when using the /starky-refresh command
export const refreshInCron = false;
export const refreshOnTransfer = false;
export const networks = ["mainnet", "sepolia"];

// TODO => add field to ask for Argent or Braavos
// we need to be able to validate config first
export const fields: StarkyModuleField[] = [];

export const shouldHaveRole = async (
  starknetWalletAddress: string,
  starknetNetwork: NetworkName,
  starkyModuleConfig: StarkyModuleConfig
): Promise<boolean> => {
  // TODO => use starkyModuleConfig to support not only argent but also Braavos
  try {
    const interface1 = await execWithRateLimit(async () => {
      return await callContract({
        starknetNetwork:
          starknetNetwork === "mainnet" ? "mainnet" : ("sepolia" as any),
        contractAddress: starknetWalletAddress,
        entrypoint: "supportsInterface",
        calldata: ["0x3943f10f"],
      });
    }, "starknet");
    const interface2 = await execWithRateLimit(async () => {
      return await callContract({
        starknetNetwork:
          starknetNetwork === "mainnet" ? "mainnet" : ("sepolia" as any),
        contractAddress: starknetWalletAddress,
        entrypoint: "supportsInterface",
        calldata: ["0xf10dbd44"],
      });
    }, "starknet");

    const isWallet = interface1[0] === "0x1" || interface2[0] === "0x1";

    if (!isWallet) return false;

    try {
      const name = await execWithRateLimit(async () => {
        return await callContract({
          starknetNetwork:
            starknetNetwork === "mainnet" ? "mainnet" : ("sepolia" as any),
          contractAddress: starknetWalletAddress,
          entrypoint: "getName",
          calldata: [],
        });
      }, "starknet");

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
    WatchTowerLogger.error(e.message, e);
    return false;
  }
};
