const domain = {
  name: "Starky",
  version: "1",
  chainId: "0x534e5f4d41494e",
};

const types = {
  StarkNetDomain: [
    { name: "name", type: "string" },
    { name: "version", type: "felt" },
    { name: "chainId", type: "felt" },
  ],
  Message: [
    {
      name: "message",
      type: "felt",
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
