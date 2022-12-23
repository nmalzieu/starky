import axios from "axios";

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
  console.log(
    `[AspectAPI] Retrieving assets for ${ownerAddress} and contract ${contractAddress} on ${starknetNetwork}...`
  );
  const network = starknetNetwork === "mainnet" ? "api" : "api-testnet";
  let next_url = `https://${network}.aspect.co/api/v0/assets?contract_address=${contractAddress}&owner_address=${ownerAddress}&limit=50`;
  const assets = [];

  while (next_url) {
    const { data } = await axios.get(next_url);
    assets.push(...data.assets);
    next_url = data.next_url;
  }

  console.log(
    `[AspectAPI] Retrieved assets for ${ownerAddress}: ${assets.length}`
  );

  return assets;
};
