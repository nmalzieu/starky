import axios from "axios";

import config from "../config";

type RetrieveAssetsParameters = {
  starknetNetwork: "mainnet" | "goerli";
  contractAddress: string;
  ownerAddress: string;
};

export const retrieveAssets = async ({
  starknetNetwork,
  contractAddress,
  ownerAddress,
}: RetrieveAssetsParameters) => {
  const network = starknetNetwork === "mainnet" ? "api" : "api-testnet";
  let nextUrl = `https://${network}.starkscan.co/api/v0/nfts?owner_address=${ownerAddress}&contract_address=${contractAddress}&limit=100`;
  const apiKey = config.STARKSCAN_API_KEY;
  const assets = [];

  while (nextUrl) {
    try {
      const { data } = await axios.get(nextUrl, {
        headers: {
          "x-api-key": apiKey,
        },
      });
      assets.push(...data.assets);
      nextUrl = data.next_url;
    } catch (e) {
      console.log(`Failed to retrieve assets from ${nextUrl} - ${e}`);
      break;
    }
  }

  return assets;
};
