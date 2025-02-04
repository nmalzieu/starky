type StarknetAccount = {
  address: string;
  network: string;
};

type ChainIds = {
  mainnet: string;
  sepolia: string;
};

const chainIds: ChainIds = {
  mainnet: "SN_MAIN",
  sepolia: "SN_SEPOLIA",
};
