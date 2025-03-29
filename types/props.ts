import { Signature } from "starknet";

import { NetworkName } from "./starknet";

export type Props = {
  discordServerName: string;
  starknetNetwork: NetworkName;
  signMessage: (message: any) => Promise<Signature>;
};
