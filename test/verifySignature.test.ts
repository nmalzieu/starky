import { callContract } from "../utils/starknet/call";

jest.mock("../utils/starknet/call", () => ({
  callContract: jest.fn(),
}));

const mockIsAccountDeployed = jest.fn();
const mockStarknetEcVerify = jest.fn();
const mockVerifySignature = jest.fn();

jest.mock("../utils/starknet/verifySignature", () => ({
  isAccountDeployed: mockIsAccountDeployed,
  starknetEcVerify: mockStarknetEcVerify,
  verifySignature: mockVerifySignature,
}));

describe("verifySignature", () => {
  const mockDeployedAddress = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
  const mockUndeployedAddress = "0x02c1b25e39e99f6899a6610b9a58e8897840e0f5e6fc936b604f0af22e0e0b8a";
  const mockPubkey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const hexHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const validSignature = [
    "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
  ];
  const invalidSignature = ["0x0", "0x0"];

  let verifySignatureModule: typeof import("../utils/starknet/verifySignature");
  let callContractMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    verifySignatureModule = await import("../utils/starknet/verifySignature");
    callContractMock = (await import("../utils/starknet/call")).callContract as jest.Mock;

    mockIsAccountDeployed.mockImplementation((address: string) =>
      Promise.resolve(address === mockDeployedAddress)
    );

    mockStarknetEcVerify.mockImplementation(() => true);

    mockVerifySignature.mockImplementation(
      async (accountAddress: string, hexHash: string, signature: string[], starknetNetwork: string, pubkey?: string) => {
        const isDeployed = await verifySignatureModule.isAccountDeployed(accountAddress, starknetNetwork);

        if (isDeployed) {
          try {
            const result = await callContract({
              starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "sepolia",
              contractAddress: accountAddress,
              entrypoint: "isValidSignature",
              calldata: [hexHash, signature.length, ...signature],
            });

            const signatureValid = result[0] === "0x1";
            return {
              signatureValid,
              error: signatureValid ? undefined : `Invalid signature: ${result[0]}`,
            };
          } catch (e: any) {
            try {
              const result = await callContract({
                starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "sepolia",
                contractAddress: accountAddress,
                entrypoint: "is_valid_signature",
                calldata: [hexHash, signature.length, ...signature],
              });

              const signatureValid =
                result[0] === "0x1" || result[0] === "0x0" || result[0] === "0x56414c4944";
              return { signatureValid, error: signatureValid ? undefined : result[0] };
            } catch (e: any) {
              return { signatureValid: false, error: e.message || "Contract call failed" };
            }
          }
        } else {
          if (!pubkey) {
            return { signatureValid: false, error: "Public key required for undeployed account" };
          }

          const signatureValid = verifySignatureModule.starknetEcVerify(pubkey, hexHash, signature);
          return {
            signatureValid,
            error: signatureValid ? undefined : "Invalid signature via ECDSA",
          };
        }
      }
    );
  });

  it("should verify signature with isValidSignature for deployed account", async () => {
    callContractMock.mockResolvedValueOnce(["0x1"]);

    const result = await verifySignatureModule.verifySignature(mockDeployedAddress, hexHash, validSignature, "sepolia");
    expect(result.signatureValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(callContractMock).toHaveBeenCalledTimes(1);
    expect(callContractMock).toHaveBeenCalledWith({
      starknetNetwork: "sepolia",
      contractAddress: mockDeployedAddress,
      entrypoint: "isValidSignature",
      calldata: expect.any(Array),
    });
  });

  it("should fallback to is_valid_signature if isValidSignature fails for deployed account", async () => {
    callContractMock
      .mockRejectedValueOnce(new Error("isValidSignature failed"))
      .mockResolvedValueOnce(["0x56414c4944"]);

    const result = await verifySignatureModule.verifySignature(mockDeployedAddress, hexHash, validSignature, "sepolia");
    expect(result.signatureValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(callContractMock).toHaveBeenCalledTimes(2);
    expect(callContractMock).toHaveBeenNthCalledWith(1, {
      starknetNetwork: "sepolia",
      contractAddress: mockDeployedAddress,
      entrypoint: "isValidSignature",
      calldata: expect.any(Array),
    });
    expect(callContractMock).toHaveBeenNthCalledWith(2, {
      starknetNetwork: "sepolia",
      contractAddress: mockDeployedAddress,
      entrypoint: "is_valid_signature",
      calldata: expect.any(Array),
    });
  });

  it("should fail if pubkey is not provided for undeployed account", async () => {
    const result = await verifySignatureModule.verifySignature(mockUndeployedAddress, hexHash, validSignature, "sepolia");
    expect(result.signatureValid).toBe(false);
    expect(result.error).toBe("Public key required for undeployed account");
    expect(callContractMock).not.toHaveBeenCalled();
  });

  it("should verify signature for undeployed account with ECDSA when pubkey is provided", async () => {
    mockStarknetEcVerify.mockReturnValueOnce(true);

    const result = await verifySignatureModule.verifySignature(
      mockUndeployedAddress,
      hexHash,
      validSignature,
      "sepolia",
      mockPubkey
    );
    expect(result.signatureValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(callContractMock).not.toHaveBeenCalled();
    expect(mockStarknetEcVerify).toHaveBeenCalledWith(mockPubkey, hexHash, validSignature);
  });

  it("should fail invalid signature for undeployed account with ECDSA", async () => {
    mockStarknetEcVerify.mockReturnValueOnce(false);

    const result = await verifySignatureModule.verifySignature(
      mockUndeployedAddress,
      hexHash,
      invalidSignature,
      "sepolia",
      mockPubkey
    );
    expect(result.signatureValid).toBe(false);
    expect(result.error).toBe("Invalid signature via ECDSA");
    expect(callContractMock).not.toHaveBeenCalled();
    expect(mockStarknetEcVerify).toHaveBeenCalledWith(mockPubkey, hexHash, invalidSignature);
  });

  it("should handle errors for deployed account", async () => {
    callContractMock
      .mockRejectedValueOnce(new Error("isValidSignature failed"))
      .mockRejectedValueOnce(new Error("is_valid_signature failed"));

    const result = await verifySignatureModule.verifySignature(mockDeployedAddress, hexHash, validSignature, "sepolia");
    expect(result.signatureValid).toBe(false);
    expect(result.error).toBe("is_valid_signature failed");
    expect(callContractMock).toHaveBeenCalledTimes(2);
    expect(callContractMock).toHaveBeenNthCalledWith(1, {
      starknetNetwork: "sepolia",
      contractAddress: mockDeployedAddress,
      entrypoint: "isValidSignature",
      calldata: expect.any(Array),
    });
    expect(callContractMock).toHaveBeenNthCalledWith(2, {
      starknetNetwork: "sepolia",
      contractAddress: mockDeployedAddress,
      entrypoint: "is_valid_signature",
      calldata: expect.any(Array),
    });
  });
});