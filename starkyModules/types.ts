import { DiscordServerConfig } from "../db/entity/DiscordServerConfig";

export type StarkyModuleField = {
  id: string;
  question: string;
  textarea?: boolean;
  placeholder?: string;
};

export type StarkyModule = {
  name: string;
  fields: StarkyModuleField[];
  shouldHaveRole: (
    starknetWalletAddress: string,
    starknetNetwork: "mainnet" | "goerli",
    starkyModuleConfig: StarkyModuleConfig
  ) => Promise<boolean>;
  configName: (config: DiscordServerConfig) => string;
};

export type StarkyModules = {
  [moduleId: string]: StarkyModule;
};

export type StarkyModuleConfig = {
  [key: string]: string;
};
