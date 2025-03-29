import { connect, disconnect } from "starknetkit";

export const StarknetWallet = {
  connect: async (): Promise<StarknetAccount> => {
    const result = await connect();

    if (!result || !result.wallet) {
      throw new Error("Failed to connect Starknet wallet");
    }

    const wallet = result.wallet;

    return {
      address: wallet.account.a,
      network: wallet.account.chainId,
    };
  },

  disconnect: async (): Promise<void> => {
    await disconnect();
  },

  signMessage: async (
    message: string,
    account: StarknetAccount
  ): Promise<string> => {
    // Implement Starknet message signing logic here
    throw new Error("signMessage not implemented");
  },

  verifyNetwork: (
    walletChainId: string,
    expectedNetwork: keyof ChainIds
  ): boolean => {
    if (!(expectedNetwork in chainIds)) {
      throw new Error(`Unsupported network: ${expectedNetwork}`);
    }

    return walletChainId === chainIds[expectedNetwork];
  },
};
