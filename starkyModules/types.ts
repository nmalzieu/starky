export type StarkyModuleField = {
  id: string;
  question: string;
  textarea?: boolean;
  placeholder?: string;
};

export type ShouldHaveRole = (
  starknetWalletAddress: string,
  starknetNetwork: "mainnet" | "goerli",
  starkyModuleConfig: StarkyModuleConfig
) => Promise<boolean>;

export type StarkyModule = {
  name: string;
  fields: StarkyModuleField[];
  shouldHaveRole: ShouldHaveRole;
  refreshInCron: boolean;
  refreshOnTransfer: boolean;
};

export type StarkyModules = {
  [moduleId: string]: StarkyModule;
};

export type StarkyModuleConfig = {
  [key: string]: string;
};
