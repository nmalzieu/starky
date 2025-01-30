import { getAddress, getNetwork, signMessage } from "@stellar/freighter-api";

export const StellarWallet = {
  connect: async () => {
    const publicKey = await getAddress();
    const network = await getNetwork();
    return { publicKey, network };
  },

  signMessage: async (message: string, account: { publicKey: string }) => {
    return signMessage(message, { address: account.publicKey });
  },

  verifyNetwork: (walletNetwork: string, expectedNetwork: string) => {
    const expected = expectedNetwork.includes("mainnet") ? "public" : "testnet";
    return walletNetwork === expected;
  },
};
