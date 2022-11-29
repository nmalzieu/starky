import { DiscordMember } from "../db/entity/DiscordMember";
import { DiscordServerConfig } from "../db/entity/DiscordServerConfig";
import { configName } from "./erc721";

export type StarkyModuleField = {
  id: string;
  question: string;
  textarea?: boolean;
};

export type StarkyModule = {
  name: string;
  fields: StarkyModuleField[];
  shouldHaveRole: (
    starknetWalletAddress: string,
    starknetNetwork: "mainnet" | "goerli",
    starkyModuleConfig: StarkyModuleConfig
  ) => Promise<boolean>;
  configName: (
    starknetNetwork: "mainnet" | "goerli",
    starkyModuleConfig: StarkyModuleConfig
  ) => string;
};

export type StarkyModules = {
  [moduleId: string]: StarkyModule;
};

export type StarkyModuleConfig = {
  [key: string]: string;
};
