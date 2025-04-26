import WatchTowerLogger from "../../watchTower";
import { callContract } from "./call";
import { Provider, num, CallData } from "starknet";
import { ec as EllipticEC } from "elliptic";

type SignatureVerify = {
  signatureValid: boolean;
  error?: string;
};

export async function isAccountDeployed(
  accountAddress: string,
  starknetNetwork: string
): Promise<boolean> {
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
    return code.bytecode.length > 0;
  } catch (error) {
    WatchTowerLogger.error(
      `Failed to check deployment status for ${accountAddress}: ${error}`
    );
    return false;
  }
}

export function starknetEcVerify(
  pubkey: string,
  messageHash: string,
  signature: string[]
): boolean {
  try {
    const curve = new EllipticEC("secp256k1");
    const key = curve.keyFromPublic(pubkey, "hex");
    const msgHashBigInt = num.toBigInt(messageHash);
    const [r, s] = signature.map((sig) => num.toBigInt(sig));

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

export const verifySignature = async (
  accountAddress: string,
  hexHash: string,
  signature: string[],
  starknetNetwork: string,
  pubkey?: string
): Promise<SignatureVerify> => {
  const isDeployed = await isAccountDeployed(accountAddress, starknetNetwork);

  if (isDeployed) {
    try {
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
