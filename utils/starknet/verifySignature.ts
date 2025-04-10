import WatchTowerLogger from "../../watchTower";
import { callContract } from "./call";
import { Provider, num, CallData } from "starknet";
import { ec as EllipticEC } from "elliptic";
import { jest } from "@jest/globals";

// Define the return type for signature verification results
type SignatureVerify = {
  signatureValid: boolean;
  error?: string;
};

// Define mocks for unit testing with explicit types to match the real functions
const _mocks = {
  // Mock for isAccountDeployed, expects a Promise<boolean> return type
  mockIsAccountDeployed:
    jest.fn<
      (accountAddress: string, starknetNetwork: string) => Promise<boolean>
    >(),
  // Mock for starknetEcVerify, expects a boolean return type
  mockStarknetEcVerify:
    jest.fn<
      (pubkey: string, messageHash: string, signature: string[]) => boolean
    >(),
  // Mock for verifySignature, expects a Promise<SignatureVerify> return type
  mockVerifySignature:
    jest.fn<
      (
        accountAddress: string,
        hexHash: string,
        signature: string[],
        starknetNetwork: string,
        pubkey?: string
      ) => Promise<SignatureVerify>
    >(),
};

// Check if an account is deployed on the Starknet network
export async function isAccountDeployed(
  accountAddress: string,
  starknetNetwork: string
): Promise<boolean> {
  // Use the mock if defined (for unit tests)
  if (_mocks.mockIsAccountDeployed) {
    return _mocks.mockIsAccountDeployed(accountAddress, starknetNetwork);
  }

  // Create a Starknet provider to query the network
  const provider = new Provider({
    sequencer: {
      baseUrl:
        starknetNetwork === "mainnet"
          ? "https://alpha-mainnet.starknet.io"
          : "https://alpha4-2.starknet.io",
    },
  });
  try {
    const code = await provider.getCode(accountAddress);
    // Return true if the account has bytecode (i.e., it's deployed)
    return code.bytecode.length > 0;
  } catch (error) {
    WatchTowerLogger.error(
      `Failed to check deployment status for ${accountAddress}: ${error}`
    );
    return false;
  }
}

// Verify a signature using ECDSA for undeployed accounts
export function starknetEcVerify(
  pubkey: string,
  messageHash: string,
  signature: string[]
): boolean {
  // Use the mock if defined (for unit tests)
  if (_mocks.mockStarknetEcVerify) {
    return _mocks.mockStarknetEcVerify(pubkey, messageHash, signature);
  }

  try {
    // Initialize the elliptic curve (secp256k1) for ECDSA verification
    const curve = new EllipticEC("secp256k1");
    const key = curve.keyFromPublic(pubkey, "hex");
    const msgHashBigInt = num.toBigInt(messageHash);
    const [r, s] = signature.map((sig) => num.toBigInt(sig));

    // Verify the signature against the message hash
    const isValid = key.verify(num.toHex(msgHashBigInt), {
      r: num.toHex(r),
      s: num.toHex(s),
    });

    return isValid;
  } catch (error) {
    WatchTowerLogger.error(
      `ECDSA verification failed for pubkey ${pubkey}: ${error}`
    );
    return false;
  }
}

// Main function to verify a signature, supporting both deployed and undeployed accounts
export const verifySignature = async (
  accountAddress: string,
  hexHash: string,
  signature: string[],
  starknetNetwork: string,
  pubkey?: string
): Promise<SignatureVerify> => {
  // Use the mock if defined (for unit tests)
  if (_mocks.mockVerifySignature) {
    return _mocks.mockVerifySignature(
      accountAddress,
      hexHash,
      signature,
      starknetNetwork,
      pubkey
    );
  }

  // Check if the account is deployed
  const isDeployed = await isAccountDeployed(accountAddress, starknetNetwork);

  if (isDeployed) {
    try {
      // Call the contract to verify the signature using isValidSignature entrypoint
      const result = await callContract({
        starknetNetwork: starknetNetwork === "mainnet" ? "mainnet" : "sepolia",
        contractAddress: accountAddress,
        entrypoint: "isValidSignature",
        calldata: CallData.compile([hexHash, signature.length, ...signature]),
      });

      const signatureValid = result[0] === "0x1";
      if (signatureValid) {
        WatchTowerLogger.info(
          `Signature verified successfully via isValidSignature for deployed account ${accountAddress}`
        );
      } else {
        WatchTowerLogger.error(
          `Signature invalid for deployed account ${accountAddress}: ${result[0]}`
        );
      }
      return {
        signatureValid,
        error: signatureValid ? undefined : `Invalid signature: ${result[0]}`,
      };
    } catch (e: any) {
      try {
        // Fallback to is_valid_signature entrypoint if isValidSignature fails
        const result = await callContract({
          starknetNetwork:
            starknetNetwork === "mainnet" ? "mainnet" : "sepolia",
          contractAddress: accountAddress,
          entrypoint: "is_valid_signature",
          calldata: CallData.compile([hexHash, signature.length, ...signature]),
        });

        const signatureValid =
          result[0] === "0x1" ||
          result[0] === "0x0" ||
          result[0] === "0x56414c4944";

        if (signatureValid) {
          WatchTowerLogger.info(
            `Signature verified successfully via is_valid_signature for deployed account ${accountAddress}`
          );
        } else {
          WatchTowerLogger.error(
            `Signature invalid for deployed account ${accountAddress}: ${result[0]}`
          );
        }
        return {
          signatureValid,
          error: signatureValid ? undefined : result[0],
        };
      } catch (e: any) {
        WatchTowerLogger.error(
          `Error while verifying signature for ${accountAddress} on ${starknetNetwork}. Error: ${e.message}`
        );
        return {
          signatureValid: false,
          error: e.message || "Contract call failed",
        };
      }
    }
  } else {
    // Handle undeployed accounts using ECDSA verification
    if (!pubkey) {
      WatchTowerLogger.error(
        `Cannot verify signature for undeployed account ${accountAddress}: public key not provided`
      );
      return {
        signatureValid: false,
        error: "Public key required for undeployed account",
      };
    }

    const signatureValid = starknetEcVerify(pubkey, hexHash, signature);
    if (signatureValid) {
      WatchTowerLogger.info(
        `Signature verified successfully via ECDSA for undeployed account ${accountAddress}`
      );
    } else {
      WatchTowerLogger.error(
        `Signature invalid via ECDSA for undeployed account ${accountAddress}`
      );
    }
    return {
      signatureValid,
      error: signatureValid ? undefined : "Invalid signature via ECDSA",
    };
  }
};

// Expose _mocks as a property of verifySignature for unit testing
verifySignature._mocks = _mocks;
