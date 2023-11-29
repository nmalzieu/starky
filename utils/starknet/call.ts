import { BigNumberish, RawCalldata, RpcProvider } from "starknet";

import chainAliasByNetwork from "../../configs/chainAliasByNetwork.json";

type CallContractParameters = {
  starknetNetwork: "mainnet" | "goerli";
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
  const provider = new RpcProvider({
    chainId: chainAliasByNetwork[starknetNetwork][1] as any,
    nodeUrl: chainAliasByNetwork[starknetNetwork][0],
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
