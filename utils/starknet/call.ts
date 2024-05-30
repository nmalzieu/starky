import { BigNumberish, RawCalldata, RpcProvider } from "starknet";

import chainAliasByNetwork from "../../configs/chainAliasByNetwork.json";
import { NetworkName } from "../../types/starknet";

type CallContractParameters = {
  starknetNetwork: NetworkName;
  contractAddress: string;
  entrypoint: string;
  calldata?: any[];
};

const getRawCallData = (d: any): BigNumberish => {
  if (!isNaN(d)) {
    return `${d}`;
  }
  return d;
};

export const callContract = async ({
  starknetNetwork,
  contractAddress,
  entrypoint,
  calldata,
}: CallContractParameters) => {
  const chainId = chainAliasByNetwork[starknetNetwork][1] as any;
  if (!chainId) throw new Error("Invalid network");

  const nodeUrl = process.env[`RPC_URL_${starknetNetwork.toUpperCase()}`];
  if (!nodeUrl) throw new Error("Invalid network");
  const provider = new RpcProvider({
    chainId,
    nodeUrl,
  });
  const rawCalldata: RawCalldata = [];
  calldata?.forEach((d) => rawCalldata.push(getRawCallData(d)));
  const response = await provider.callContract({
    contractAddress,
    entrypoint,
    calldata: rawCalldata,
  });
  return response.result;
};
