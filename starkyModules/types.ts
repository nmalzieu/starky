import { DiscordMember } from "../db/entity/DiscordMember";
import { DiscordServerConfig } from "../db/entity/DiscordServerConfig";

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
};

export type StarkyModules = {
  [moduleId: string]: StarkyModule;
};

export type StarkyModuleConfig = {
  [key: string]: string;
};
