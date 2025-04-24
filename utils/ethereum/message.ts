const domain = {
  name: "Starky",
  version: "1",
  chainId: 1, // Mainnet by default, will be updated dynamically
};

const types = {
  StarkNetDomain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  Message: [
    {
      name: "message",
      type: "string",
    },
  ],
};

const messageToSign = {
  domain,
  types,
  primaryType: "Message",
  message: {
    message: "Starky signature",
  },
};

export default messageToSign;
