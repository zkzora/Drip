import { rpc, xdr, nativeToScVal, scValToNative, Address } from "@stellar/stellar-sdk";
import type { DripChainAdapter } from "./types";
import type { AccessReason, DripAccessResult, CheckDripAccessParams } from "../chain";

const STELLAR_CONTRACT_ID = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID;
const STELLAR_RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;

function isConfigured(): boolean {
  return (
    !!STELLAR_CONTRACT_ID &&
    STELLAR_CONTRACT_ID !== "REPLACE_WITH_STELLAR_TESTNET_CONTRACT_ID" &&
    !!STELLAR_RPC_URL &&
    STELLAR_RPC_URL !== "REPLACE_WITH_STELLAR_TESTNET_RPC"
  );
}

// Constructs the Soroban storage key for DataKey::Stream(stream_id).
// Soroban encodes a newtype enum variant as ScvVec([Symbol(name), value]).
function makeStreamKey(streamId: bigint): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Stream"),
    nativeToScVal(streamId, { type: "u64" }),
  ]);
}

// Soroban unit enum variants come back from scValToNative as strings ("Active"),
// but may also arrive as a single-element array or a single-key object depending on
// the SDK version.  Normalise to a plain string so the status checks below are simple.
function parseStatus(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  if (raw && typeof raw === "object") {
    const keys = Object.keys(raw as Record<string, unknown>);
    if (keys.length === 1) return keys[0];
  }
  return String(raw);
}

export const stellarTestnetAdapter: DripChainAdapter = {
  async checkDripAccess(params: CheckDripAccessParams): Promise<DripAccessResult> {
    if (!isConfigured()) {
      return {
        allowed: false,
        reason: "config_missing",
        recommendation:
          "Stellar Testnet support is not configured. " +
          "Set NEXT_PUBLIC_STELLAR_CONTRACT_ID and NEXT_PUBLIC_STELLAR_RPC_URL in .env.local.",
      };
    }

    const { walletAddress, streamId } = params;

    // Validate Stellar address (G... or C... format).
    try {
      new Address(walletAddress);
    } catch {
      return {
        allowed: false,
        reason: "wallet_mismatch",
        recommendation: "The wallet address is not a valid Stellar address (expected G... public key).",
      };
    }

    if (!streamId) {
      return {
        allowed: false,
        reason: "no_stream",
        recommendation:
          "No stream ID provided. Pass a streamId to check a specific DRIP stream on Stellar Testnet.",
      };
    }

    let streamIdBigInt: bigint;
    try {
      streamIdBigInt = BigInt(streamId);
    } catch {
      return {
        allowed: false,
        reason: "no_stream",
        recommendation: `Stream ID "${streamId}" is not a valid integer.`,
      };
    }

    const server = new rpc.Server(STELLAR_RPC_URL!);

    try {
      const entry = await server.getContractData(
        STELLAR_CONTRACT_ID!,
        makeStreamKey(streamIdBigInt),
        rpc.Durability.Persistent,
      );

      // Extract the raw ScVal from the ledger entry and convert to a plain JS object.
      const streamScVal = entry.val.contractData().val();
      const stream = scValToNative(streamScVal) as Record<string, unknown>;

      const status = parseStatus(stream.status);
      const receiver = String(stream.receiver ?? "");

      // If a specific wallet was provided, verify it is the stream's receiver.
      if (receiver && receiver !== walletAddress) {
        return {
          allowed: false,
          reason: "wallet_mismatch",
          recommendation:
            `This stream's receiver (${receiver.slice(0, 8)}...) does not match the provided wallet. ` +
            "Provide the receiver's address to check access.",
        };
      }

      if (status === "Active") {
        return {
          allowed: true,
          reason: "active",
          recommendation: "Stream is active. Access allowed.",
          streamSummary: {
            streamId: String(stream.stream_id ?? streamId),
            payer: String(stream.payer ?? ""),
            receiver,
            status,
            amount: String(stream.amount ?? ""),
            withdrawn: String(stream.withdrawn ?? ""),
          },
        };
      }

      // Map Soroban StreamStatus variants to DRIP AccessReason.
      const statusToReason: Record<string, AccessReason> = {
        Paused: "paused",
        Cancelled: "cancelled",
        Completed: "expired",
      };
      const reason: AccessReason = statusToReason[status] ?? "no_stream";

      const reasonToMsg: Record<string, string> = {
        paused: "The DRIP stream is paused. Access is blocked until the payer resumes it.",
        cancelled: "The DRIP stream has been cancelled. Access is permanently blocked.",
        expired: "The DRIP stream has completed. All funds are vested; access is blocked.",
        no_stream: `Stream ${streamId} has an unrecognised status "${status}". Access blocked.`,
      };

      return {
        allowed: false,
        reason,
        recommendation: reasonToMsg[reason] ?? "Access not allowed.",
        streamSummary: {
          streamId: String(stream.stream_id ?? streamId),
          status,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      // Soroban returns a specific error when the ledger entry is absent or expired.
      if (
        msg.includes("entryNotFound") ||
        msg.includes("not found") ||
        msg.includes("does not exist")
      ) {
        return {
          allowed: false,
          reason: "no_stream",
          recommendation: `No stream with ID ${streamId} found on Stellar Testnet. ` +
            "The stream may not exist or its ledger entry may have expired.",
        };
      }

      return {
        allowed: false,
        reason: "unknown",
        recommendation:
          "Unexpected error reading Stellar stream: " + msg.slice(0, 160),
      };
    }
  },
};
