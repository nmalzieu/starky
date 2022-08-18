import { DiscordMember } from "../db/entity/DiscordMember";
import { DiscordServer } from "../db/entity/DiscordServer";

export type StarkcordModuleField = {
  id: string;
  question: string;
  textarea?: boolean;
};

export type StarkcordModule = {
  name: string;
  fields: StarkcordModuleField[];
  shouldHaveRole: (
    starknetWalletAddress: string,
    starknetNetwork: "mainnet" | "goerli",
    starkcordModuleConfig: StarkcordModuleConfig
  ) => Promise<boolean>;
};

export type StarkcordModules = {
  [moduleId: string]: StarkcordModule;
};

export type StarkcordModuleConfig = {
  [key: string]: string;
};
