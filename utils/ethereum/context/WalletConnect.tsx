"use client";

import { createContext, useContext, useState } from "react";
import { ethers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";
import networks from "../../../configs/networks.json";
import {
  connect as starknetConnect,
  disconnect as starknetDisconnect,
} from "starknetkit";

type WalletContextType = {
  connect: (networkName: string) => Promise<void>;
  disconnect: () => void;
  account: string | null;
  provider: ethers.BrowserProvider | null;
  chainId: number | string | null;
  networkType: "ethereum" | "starknet" | null;
  signMessage: (message: string) => Promise<string>;
  balance: string | null;
};

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | string | null>(null);
  const [networkType, setNetworkType] = useState<
    "ethereum" | "starknet" | null
  >(null);
  const [wcProvider, setWcProvider] = useState<any>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const INFURA_PROJECT_ID = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID;

  if (!INFURA_PROJECT_ID) {
    throw new Error(
      "Missing NEXT_PUBLIC_INFURA_PROJECT_ID in .env or .env.local"
    );
  }

  const connect = async (networkName: string) => {
    const network = networks.find((n) => n.name === networkName);
    if (!network) throw new Error("Network not supported");

    try {
      if (networkName === "ethereum-mainnet") {
        //connect to Metamask or any injected extension
        if (typeof window !== "undefined" && (window as any).ethereum) {
          const ethersProvider = new ethers.BrowserProvider(
            (window as any).ethereum
          );
          await (window as any).ethereum.request({
            method: "eth_requestAccounts",
          });
          const signer = await ethersProvider.getSigner();
          const address = await signer.getAddress();

          // Fetching user balance
          const balanceInWei = await ethersProvider.getBalance(address);
          setBalance(ethers.formatEther(balanceInWei));

          setProvider(ethersProvider);
          setAccount(address);
          setChainId(
            await ethersProvider.getNetwork().then((net) => Number(net.chainId))
          );
          setNetworkType("ethereum");
        } else {
          // Fallback to WalletConnect
          const wcProvider = new WalletConnectProvider({
            infuraId: INFURA_PROJECT_ID,
            rpc: { [network.chainId as number]: network.url ?? "" },
            chainId: network.chainId,
          });

          await wcProvider.enable();
          const ethersProvider = new ethers.BrowserProvider(wcProvider);
          const signer = await ethersProvider.getSigner();
          const address = await signer.getAddress();

          setProvider(ethersProvider);
          setAccount(address);
          setChainId(network.chainId ?? null);
          setNetworkType("ethereum");
          setWcProvider(wcProvider);
        }
      } else {
        // Starknet connection
        const { wallet } = await starknetConnect();
        if (!wallet) throw new Error("No wallet found");

        const chain =
          wallet.account?.provider.chainId ||
          wallet.provider?.chainId ||
          wallet.chainId;
        setAccount(wallet.account.address);
        setChainId(chain);
        setNetworkType("starknet");
      }
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      if (networkType === "ethereum") {
        if (wcProvider) {
          await wcProvider.disconnect();
          wcProvider.connector?.killSession();
        }
      } else if (networkType === "starknet") {
        await starknetDisconnect();
      }
    } catch (error) {
      console.error("Error during disconnect:", error);
    } finally {
      setAccount(null);
      setProvider(null);
      setChainId(null);
      setNetworkType(null);
      setWcProvider(null);
    }
  };

  const signMessage = async (message: string) => {
    if (!account || !provider) throw new Error("Not connected");

    if (networkType === "ethereum") {
      const signer = await provider.getSigner();
      return await signer.signMessage(message);
    }

    throw new Error("Unsupported network for signing");
  };

  return (
    <WalletContext.Provider
      value={{
        connect,
        disconnect,
        account,
        provider,
        chainId,
        networkType,
        signMessage,
        balance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
