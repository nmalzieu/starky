import { ShouldHaveRole, StarkyModuleField } from "../types/starkyModules";
import { retrieveAssets } from "../utils/retrieveAsset";

export const name = "ERC-721 Metadata";
export const refreshInCron = false;
export const refreshOnTransfer = true;
export const networks = ["mainnet", "sepolia"];

export const fields: StarkyModuleField[] = [
  {
    id: "contractAddress",
    question: "What's the ERC-721 contract address?",
  },
  {
    id: "conditionPattern",
    question: "What's the path & pattern to get the role?",
    textarea: true,
    placeholder:
      '[{"path": "attributes.trait_type.Trait", "pattern":"^Value$"}]',
  },
];

const tryParseJSONObject = (jsonString: string): boolean | any[] => {
  try {
    const o = JSON.parse(jsonString);
    return o && typeof o === "object" ? o : false;
  } catch (e) {
    return false;
  }
};

export const shouldHaveRole: ShouldHaveRole = async (
  starknetWalletAddress,
  starknetNetwork,
  starkyModuleConfig,
  cachedData = {}
) => {
  const ownedAssets = cachedData.assets
    ? cachedData.assets
    : await retrieveAssets({
        network: starknetNetwork,
        contractAddress: starkyModuleConfig.contractAddress,
        ownerAddress: starknetWalletAddress,
        customApi: {
          apiUri: starkyModuleConfig.customApiUri,
          paramName: starkyModuleConfig.customApiParamName,
        },
        address: starknetWalletAddress,
      });

  const conditions = tryParseJSONObject(starkyModuleConfig.conditionPattern);
  if (conditions && typeof conditions === "object") {
    let hasOneOfTheConditions = false;
    ownedAssets.forEach((asset: any) => {
      let conditionMatched = true;
      for (const condition of conditions) {
        const pathElements = condition.path.split(".");
        let currentData = asset;

        // traverse the asset object to get the value at the specified path
        for (let i = 0; i < pathElements.length; i++) {
          if (currentData.hasOwnProperty(pathElements[i])) {
            currentData = currentData[pathElements[i]];
          } else if (
            Array.isArray(currentData) &&
            pathElements[i] &&
            pathElements[i + 1]
          ) {
            // check path provided matches metadata attributes array {"trait_type": "name", "value": "value"}
            const foundData = currentData.find(
              (attribute) => attribute[pathElements[i]] === pathElements[i + 1]
            );
            currentData = (foundData && foundData.value) || null;
            if (!currentData) conditionMatched = false;
            break;
          } else {
            // path does not exist in the asset object
            conditionMatched = false;
            break;
          }
        }

        // check if the value at the specified path matches the regex
        const regex = new RegExp(condition.pattern);
        if (!regex.test(currentData)) {
          conditionMatched = false;
          break;
        }
      }
      if (conditionMatched) hasOneOfTheConditions = true;
    });
    return hasOneOfTheConditions;
  } else {
    return false;
  }
};
