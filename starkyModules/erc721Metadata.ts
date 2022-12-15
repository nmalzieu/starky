import { retrieveAssets } from "../aspect/retrieveAssets";

import { StarkyModuleConfig, StarkyModuleField } from "./types";

export const name = "ERC-721 Metadata";

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

export const configName = (
  starknetNetwork: string,
  starkyModuleConfig: StarkyModuleConfig
): string => {
  return `${starknetNetwork} - ERC-721 Metadata - ${starkyModuleConfig.contractAddress}`;
};

const tryParseJSONObject = (jsonString: string): boolean | any[] => {
  try {
    const o = JSON.parse(jsonString);
    return o && typeof o === "object" ? o : false;
  } catch (e) {
    return false;
  }
};

export const shouldHaveRole = async (
  starknetWalletAddress: string,
  starknetNetwork: "mainnet" | "goerli",
  starkyModuleConfig: StarkyModuleConfig
): Promise<boolean> => {
  const ownedAssets = await retrieveAssets({
    starknetNetwork,
    contractAddress: starkyModuleConfig.contractAddress,
    ownerAddress: starknetWalletAddress,
  });

  const conditions = tryParseJSONObject(starkyModuleConfig.conditionPattern);
  if (conditions && typeof conditions === "object") {
    let isFulfilled = false;
    ownedAssets.forEach((asset: any) => {
      let isMatched = true;
      for (const c of conditions) {
        const pathElements = c.path.split(".");
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
            if (!currentData) isMatched = false;
            break;
          } else {
            // path does not exist in the asset object
            isMatched = false;
            break;
          }
        }

        // check if the value at the specified path matches the regex
        const regex = new RegExp(c.pattern);
        if (!regex.test(currentData)) {
          isMatched = false;
          break;
        }
      }
      if (isMatched) isFulfilled = true;
    });
    return isFulfilled;
  } else {
    return false;
  }
};
