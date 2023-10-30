import { FieldElement, v1alpha2 as starknet } from "@apibara/starknet";

export const convertFieldEltToStringHex = (address: starknet.IFieldElement) => {
  return "0x" + FieldElement.toBigInt(address).toString(16);
};

export const compareTwoHexStrings = (hex1: string, hex2: string) => {
  // Remove 0x
  // Remove leading 0s
  // Lowercase
  // Return true if equal
  return (
    hex1.replace("0x", "").replace(/^0+/, "").toLowerCase() ===
    hex2.replace("0x", "").replace(/^0+/, "").toLowerCase()
  );
};
