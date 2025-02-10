import { Signature } from "starknet";

import { NetworkName } from "../../starky-fix-issue-52/types/starknet";

export type Props = {
  discordServerName: string;
  starknetNetwork: NetworkName;
  signMessage: (message: any) => Promise<Signature>;
};
