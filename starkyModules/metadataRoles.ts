import { retrieveAssets } from "../aspect/retrieveAssets";

import { StarkyModuleConfig, StarkyModuleField } from "./types";

export const name = "Metedata Roles";

export const fields: StarkyModuleField[] = [
    {
      id: "contractAddress",
      question: "What's the ERC-721 contract address?",
    },
    {
      id: "conditionPattern",
      question: "What's the path & pattern to get the role?",
      textarea: true,
    },
  ];

  export const configName = (
    starknetNetwork: string,
    starkyModuleConfig: StarkyModuleConfig
  ): string => {
    return `${starknetNetwork} - Metadata - ${starkyModuleConfig.contractAddress}`;
  };

const tryParseJSONObject = (jsonString : string) => {
    try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }
    return false;
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
    if (!conditions) return false;

    let isFulfilled = false;
    ownedAssets.forEach((asset : any) => {
        let isMatched = true;
        for (const c of conditions) {
            const pathElements = c.path.split('.');
            let currentData = asset;              
          
            // traverse the asset object to get the value at the specified path
            for (let i = 0; i < pathElements.length; i++) {
              if (currentData.hasOwnProperty(pathElements[i])) {
                currentData = currentData[pathElements[i]];
              } else if (Array.isArray(currentData)) {
                currentData = currentData.find(
                    attribute => attribute[pathElements[i]] === pathElements[i + 1]
                  ).value;
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
  };