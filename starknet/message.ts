const domain = {
  name: "Starky",
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
