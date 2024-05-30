import axios from "axios";

import { NetworkName } from "../../types/starknet";

type ClassHashParameters = {
  starknetNetwork: NetworkName;
  contractAddress: string;
};

export const getClassHashAt = async ({
  starknetNetwork,
  contractAddress,
}: ClassHashParameters): Promise<string> => {
  const gatewayDomain =
    starknetNetwork === "mainnet"
      ? "alpha-mainnet.starknet.io"
      : "alpha4.starknet.io";
  const gatewayUrl = `https://${gatewayDomain}/feeder_gateway/get_class_hash_at?contractAddress=${contractAddress}`;
  const { data } = await axios.get(gatewayUrl);
  return data;
};
