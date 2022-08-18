const domain = {
  name: "Starkcord",
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
    message: "Starkcord signature",
  },
};

export default messageToSign;
