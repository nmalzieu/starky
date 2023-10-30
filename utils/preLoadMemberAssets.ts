import { DiscordMember } from "../db/entity/DiscordMember";
import { DiscordServerConfig } from "../db/entity/DiscordServerConfig";
import { NetworkName } from "../types/starknet";

import { retrieveAssets } from "./starkscan/retrieveAssets";
import { compareTwoHexStrings } from "./string";

const loadAssets = async (
  walletAddress: string,
  networkName: NetworkName,
  transferConfigs: DiscordServerConfig[],
  contractFilter: (address: string) => boolean
) => {
  const contractAddresses = transferConfigs
    .map((config) => config.starkyModuleConfig.contractAddress)
    .filter(contractFilter)
    // Remove duplicates
    .filter((value, index, self) => self.indexOf(value) === index);
  return Object.fromEntries(
    await Promise.all(
      contractAddresses.map(async (address) => {
        const assets = await retrieveAssets({
          starknetNetwork: networkName,
          contractAddress: address,
          ownerAddress: walletAddress,
        });
        return [address, assets];
      })
    )
  );
};

const preLoadMemberAssets = async (
  member: DiscordMember,
  networkName: NetworkName,
  transferConfigs: DiscordServerConfig[],
  contractAddress?: string
) => {
  const walletAddress = member.starknetWalletAddress;
  if (!walletAddress) return {};
  const filter = contractAddress
    ? (address: string) => compareTwoHexStrings(address, contractAddress)
    : (address: string) => !!address;
  return await loadAssets(walletAddress, networkName, transferConfigs, filter);
};

export default preLoadMemberAssets;
