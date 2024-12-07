const domain = {
  name: "Starky",
  chainId: "0x534e5f4d41494e",
};

const types = {
  StarkNetDomain: [
    {
      name: "name",
      type: "felt",
    },
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
