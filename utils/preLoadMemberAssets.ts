import { DiscordMember } from "../db/entity/DiscordMember";
import { DiscordServerConfig } from "../db/entity/DiscordServerConfig";
import { NetworkName } from "../types/starknet";

import { compareTwoHexStrings } from "./data/string";
import { retrieveAssets } from "./retrieveAsset";

const loadAssets = async (
  walletAddress: string,
  networkName: NetworkName,
  assetConfigs: DiscordServerConfig[],
  contractFilter: (address: string) => boolean
) => {
  const moduleConfigs = assetConfigs
    .map((config) => config.starkyModuleConfig)
    .filter((config) => contractFilter(config.contractAddress))
    // Group
    .filter(
      (config, index, self) =>
        self.findIndex(
          (v) =>
            v.contractAddress === config.contractAddress &&
            v.customApiUri === config.customApiUri
        ) === index
    );

  return Object.fromEntries(
    await Promise.all(
      moduleConfigs.map(async (config) => {
        const assets = await retrieveAssets({
          starknetNetwork: networkName,
          contractAddress: config.contractAddress,
          ownerAddress: walletAddress,
          customApi: {
            apiUri: config.customApiUri,
            paramName: config.customApiParamName,
          },
          address: walletAddress,
        });
        return [config.contractAddress, assets];
      })
    )
  );
};

const preLoadMemberAssets = async (
  member: DiscordMember,
  networkName: NetworkName,
  assetConfigs: DiscordServerConfig[],
  contractAddress?: string
) => {
  const walletAddress = member.starknetWalletAddress;
  if (!walletAddress) return {};
  const filter = contractAddress
    ? (address: string) => compareTwoHexStrings(address, contractAddress)
    : (address: string) => !!address;
  return await loadAssets(walletAddress, networkName, assetConfigs, filter);
};

export default preLoadMemberAssets;
