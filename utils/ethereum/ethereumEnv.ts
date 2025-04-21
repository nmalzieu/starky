export const INFURA_PROJECT_ID = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID;
export const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

export const ETHEREUM_ENABLED = !!INFURA_PROJECT_ID && !!ETHERSCAN_API_KEY;

if (!ETHEREUM_ENABLED) {
  console.warn(
    "Ethereum capabilities disabled: missing INFURA ID or ETHERSCAN API key."
  );
}
