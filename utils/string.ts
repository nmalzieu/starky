import { FieldElement, v1alpha2 as starknet } from "@apibara/starknet";

export const convertFieldEltToStringHex = (address: starknet.IFieldElement) => {
  return "0x" + FieldElement.toBigInt(address).toString(16);
};
